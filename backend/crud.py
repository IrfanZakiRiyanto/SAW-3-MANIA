import hashlib
from sqlalchemy.orm import Session
from models import User, Alternative, Criterion
from schemas import UserCreate, AlternativeCreate, AlternativeUpdate, CriterionUpdate

# ==================== AUTH / USER CRUD ====================
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def get_user_by_username(db: Session, username: str) -> User | None:
    return db.query(User).filter(User.username == username).first()

def create_user(db: Session, user_data: UserCreate) -> User:
    hashed_pw = hash_password(user_data.password)
    db_user = User(username=user_data.username, hashed_password=hashed_pw)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# ==================== ALTERNATIVE CRUD ====================
def get_alternatives(db: Session, search: str = None) -> list[Alternative]:
    query = db.query(Alternative)
    if search:
        query = query.filter(
            (Alternative.name.ilike(f"%{search}%")) |
            (Alternative.brand.ilike(f"%{search}%")) |
            (Alternative.kode.ilike(f"%{search}%"))
        )
    return query.order_by(Alternative.kode.asc()).all()

def get_alternative(db: Session, alt_id: int) -> Alternative | None:
    return db.query(Alternative).filter(Alternative.id == alt_id).first()

def create_alternative(db: Session, alt_data: AlternativeCreate) -> Alternative:
    db_alt = Alternative(**alt_data.model_dump())
    db.add(db_alt)
    db.commit()
    db.refresh(db_alt)
    return db_alt

def update_alternative(db: Session, alt_id: int, alt_data: AlternativeUpdate) -> Alternative | None:
    db_alt = db.query(Alternative).filter(Alternative.id == alt_id).first()
    if not db_alt:
        return None
    
    update_dict = alt_data.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(db_alt, k, v)
        
    db.commit()
    db.refresh(db_alt)
    return db_alt

def delete_alternative(db: Session, alt_id: int) -> bool:
    db_alt = db.query(Alternative).filter(Alternative.id == alt_id).first()
    if not db_alt:
        return False
    db.delete(db_alt)
    db.commit()
    return True

# ==================== CRITERIA CRUD ====================
def get_criteria(db: Session) -> list[Criterion]:
    return db.query(Criterion).order_by(Criterion.kode.asc()).all()

def update_criterion_weight(db: Session, code: str, weight_data: CriterionUpdate) -> Criterion | None:
    db_crit = db.query(Criterion).filter(Criterion.kode == code).first()
    if not db_crit:
        return None
    db_crit.weight = weight_data.weight
    db.commit()
    db.refresh(db_crit)
    return db_crit

# ==================== SAW CALCULATION LOGIC ====================
def map_fuzzy_c1(val: float) -> float:
    # C1 (TKDN): <45 -> 0.25; <50 -> 0.50; <55 -> 0.75; >=55 -> 1.00
    if val < 45: return 0.25
    if val < 50: return 0.50
    if val < 55: return 0.75
    return 1.00

def map_fuzzy_c2(val: float) -> float:
    # C2 (RAM): <=8 -> 0.25; <=16 -> 0.50; <=32 -> 0.75; >32 -> 1.00
    if val <= 8: return 0.25
    if val <= 16: return 0.50
    if val <= 32: return 0.75
    return 1.00

def map_fuzzy_c3(val: float) -> float:
    # C3 (SSD): <=256 -> 0.33; <=512 -> 0.67; >512 -> 1.00
    if val <= 256: return 0.33
    if val <= 512: return 0.67
    return 1.00

def map_fuzzy_c4(val: float) -> float:
    # C4 (Garansi): <=1 -> 0.25; <=2 -> 0.50; <=3 -> 0.75; >3 -> 1.00
    if val <= 1: return 0.25
    if val <= 2: return 0.50
    if val <= 3: return 0.75
    return 1.00

def map_fuzzy_c5(val: float) -> float:
    # C5 (Harga): <=11jt -> 0.25; <=14jt -> 0.50; <=17jt -> 0.75; >17jt -> 1.00
    if val <= 11000000: return 0.25
    if val <= 14000000: return 0.50
    if val <= 17000000: return 0.75
    return 1.00

def calculate_saw(db: Session) -> dict:
    alts = db.query(Alternative).all()
    crits = db.query(Criterion).order_by(Criterion.kode.asc()).all()
    
    # 1. Map Weights
    weights = {c.kode: c.weight for c in crits}
    
    # 2. Convert to Fuzzy Matrix
    fuzzy_matrix = []
    for a in alts:
        fuzzy_matrix.append({
            "kode": a.kode,
            "name": a.name,
            "f_c1": map_fuzzy_c1(a.c1_tkdn),
            "f_c2": map_fuzzy_c2(a.c2_ram),
            "f_c3": map_fuzzy_c3(a.c3_ssd),
            "f_c4": map_fuzzy_c4(a.c4_warranty),
            "f_c5": map_fuzzy_c5(a.c5_price)
        })
        
    # 3. Normalized Matrix (R)
    # Benefit: r_ij = f_ij / max(f_j) -> karena max(f_j) Benefit pasti 1.0, maka r_ij = f_ij
    # Cost: r_ij = min(f_j) / f_ij -> karena min(f_j) Cost pasti 0.25, maka r_ij = 0.25 / f_ij
    normalized_matrix = []
    for f in fuzzy_matrix:
        normalized_matrix.append({
            "kode": f["kode"],
            "name": f["name"],
            "r_c1": f["f_c1"],  # Benefit
            "r_c2": f["f_c2"],  # Benefit
            "r_c3": f["f_c3"],  # Benefit
            "r_c4": f["f_c4"],  # Benefit
            "r_c5": round(0.25 / f["f_c5"], 4) if f["f_c5"] > 0 else 0.0  # Cost (min fuzzy is 0.25)
        })
        
    # 4. Preference Value (V_i) & Ranking
    preferences = []
    for r in normalized_matrix:
        # Find raw alternative details
        alt_raw = next(a for a in alts if a.kode == r["kode"])
        
        # Calculate V_i = sum(W_j * r_ij)
        v_i = (
            (weights.get("C1", 0.30) * r["r_c1"]) +
            (weights.get("C2", 0.25) * r["r_c2"]) +
            (weights.get("C3", 0.20) * r["r_c3"]) +
            (weights.get("C4", 0.15) * r["r_c4"]) +
            (weights.get("C5", 0.10) * r["r_c5"])
        )
        v_i = round(v_i, 4) # round to 4 decimal places to match Excel
        
        # Keterangan
        keterangan = "REKOMENDASI" if v_i >= 0.8 else "TIDAK DIREKOMENDASIKAN"
        
        preferences.append({
            "kode": r["kode"],
            "name": r["name"],
            "brand": alt_raw.brand,
            "v_i": v_i,
            "keterangan": keterangan
        })
        
    # Sort preferences by V_i descending, then by kode ascending
    preferences.sort(key=lambda x: (-x["v_i"], x["kode"]))
    
    # Assign Rank numbers (with unique ranking like in Excel countif)
    for rank_idx, pref in enumerate(preferences, 1):
        pref["rank"] = rank_idx
        
    return {
        "criteria": crits,
        "fuzzy_matrix": fuzzy_matrix,
        "normalized_matrix": normalized_matrix,
        "preferences": preferences
    }
