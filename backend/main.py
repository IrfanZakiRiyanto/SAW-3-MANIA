from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, get_db
from models import Base
from schemas import (
    UserCreate, UserLogin, UserResponse,
    AlternativeCreate, AlternativeUpdate, AlternativeResponse,
    CriterionResponse, CriterionUpdate,
    SAWCalculationResult
)
import crud
import models

# Inisialisasi tabel jika belum ada
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SPK SAW Laptop API",
    description="REST API untuk Sistem Pendukung Keputusan Pengadaan Laptop menggunakan Metode SAW",
    version="0.2.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== HEALTH CHECK ====================
@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "0.2.0", "system": "SPK SAW Laptop"}

# ==================== AUTH ENDPOINTS ====================
@app.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username sudah terdaftar"
        )
    return crud.create_user(db=db, user_data=user)

@app.post("/auth/login")
def login_user(user: UserLogin, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, username=user.username)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Username tidak ditemukan"
        )
    hashed_input = crud.hash_password(user.password)
    if db_user.hashed_password != hashed_input:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password salah"
        )
    return {
        "status": "success",
        "message": "Login berhasil",
        "user": {
            "id": db_user.id,
            "username": db_user.username,
            "is_active": db_user.is_active
        }
    }

# ==================== ALTERNATIVE CRUD ENDPOINTS ====================
@app.get("/alternatives", response_model=list[AlternativeResponse])
def get_alternatives(
    search: str = Query(None, description="Cari berdasarkan nama, merek, atau kode"),
    db: Session = Depends(get_db)
):
    return crud.get_alternatives(db=db, search=search)

@app.get("/alternatives/{alt_id}", response_model=AlternativeResponse)
def get_alternative(alt_id: int, db: Session = Depends(get_db)):
    alt = crud.get_alternative(db=db, alt_id=alt_id)
    if not alt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alternatif dengan id={alt_id} tidak ditemukan"
        )
    return alt

@app.post("/alternatives", response_model=AlternativeResponse, status_code=status.HTTP_201_CREATED)
def create_alternative(alt: AlternativeCreate, db: Session = Depends(get_db)):
    # Cek kode agar unik
    exists = db.query(models.Alternative).filter(models.Alternative.kode == alt.kode).first()
    if exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Alternatif dengan Kode '{alt.kode}' sudah ada"
        )
    return crud.create_alternative(db=db, alt_data=alt)

@app.put("/alternatives/{alt_id}", response_model=AlternativeResponse)
def update_alternative(alt_id: int, alt: AlternativeUpdate, db: Session = Depends(get_db)):
    updated = crud.update_alternative(db=db, alt_id=alt_id, alt_data=alt)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alternatif dengan id={alt_id} tidak ditemukan"
        )
    return updated

@app.delete("/alternatives/{alt_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alternative(alt_id: int, db: Session = Depends(get_db)):
    success = crud.delete_alternative(db=db, alt_id=alt_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alternatif dengan id={alt_id} tidak ditemukan"
        )
    return None

# ==================== CRITERIA ENDPOINTS ====================
@app.get("/criteria", response_model=list[CriterionResponse])
def get_criteria(db: Session = Depends(get_db)):
    return crud.get_criteria(db=db)

@app.put("/criteria/{code}", response_model=CriterionResponse)
def update_criterion_weight(code: str, weight_data: CriterionUpdate, db: Session = Depends(get_db)):
    updated = crud.update_criterion_weight(db=db, code=code, weight_data=weight_data)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Kriteria dengan kode={code} tidak ditemukan"
        )
    return updated

# ==================== SAW CALCULATION ENDPOINT ====================
@app.get("/saw/calculate", response_model=SAWCalculationResult)
def calculate_saw(db: Session = Depends(get_db)):
    if db.query(models.Alternative).count() == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tidak ada alternatif laptop di database untuk dilakukan perhitungan."
        )
    return crud.calculate_saw(db=db)

# ==================== STATS ENDPOINT (TUGAS 2 MODUL) ====================
@app.get("/saw/stats")
def get_saw_stats(db: Session = Depends(get_db)):
    alts = db.query(models.Alternative).all()
    if not alts:
        return {
            "total_laptops": 0,
            "average_price": 0.0,
            "max_price": None,
            "min_price": None,
            "brand_distribution": {}
        }
        
    prices = [a.c5_price for a in alts]
    brands = [a.brand for a in alts]
    
    brand_dist = {}
    for b in brands:
        brand_dist[b] = brand_dist.get(b, 0) + 1
        
    # Perhitungan SAW untuk cari rekomendasi
    saw_res = crud.calculate_saw(db)
    recom_count = sum(1 for p in saw_res["preferences"] if p["v_i"] >= 0.8)
    
    most_expensive = max(alts, key=lambda x: x.c5_price)
    cheapest = min(alts, key=lambda x: x.c5_price)
    
    return {
        "total_laptops": len(alts),
        "recommended_count": recom_count,
        "average_price": round(sum(prices) / len(prices), 2),
        "max_price": {
            "kode": most_expensive.kode,
            "name": most_expensive.name,
            "price": most_expensive.c5_price
        },
        "min_price": {
            "kode": cheapest.kode,
            "name": cheapest.name,
            "price": cheapest.c5_price
        },
        "brand_distribution": brand_dist
    }
