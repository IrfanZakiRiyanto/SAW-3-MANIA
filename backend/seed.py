import openpyxl
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Base, Alternative, Criterion
from crud import hash_password
import models

# Inisialisasi tabel jika belum ada
Base.metadata.create_all(bind=engine)

db: Session = SessionLocal()

# 1. Seeding Kriteria jika kosong
if db.query(Criterion).count() == 0:
    default_criteria = [
        Criterion(kode="C1", name="Nilai TKDN + BMP (%)", type="Benefit", weight=0.30),
        Criterion(kode="C2", name="Kapasitas RAM (GB)", type="Benefit", weight=0.25),
        Criterion(kode="C3", name="Kapasitas SSD (GB)", type="Benefit", weight=0.20),
        Criterion(kode="C4", name="Masa Garansi (Thn)", type="Benefit", weight=0.15),
        Criterion(kode="C5", name="Harga Satuan (Rp)", type="Cost", weight=0.10)
    ]
    db.add_all(default_criteria)
    db.commit()
    print("Default criteria seeded successfully.")
else:
    print("Criteria already seeded.")

# 2. Seeding default Admin user jika kosong
if db.query(models.User).filter(models.User.username == "admin").count() == 0:
    admin_user = models.User(username="admin", hashed_password=hash_password("admin"))
    db.add(admin_user)
    db.commit()
    print("Default admin user created successfully.")

def clean_numeric(val):
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace("Rp", "").replace(" ", "")
    if not s:
        return 0.0
    if "," in s:
        s = s.replace(".", "").replace(",", ".")
    else:
        if s.count(".") > 1:
            s = s.replace(".", "")
        else:
            parts = s.split(".")
            if len(parts) == 2 and len(parts[1]) == 3 and float(parts[0]) > 0:
                s = s.replace(".", "")
    try:
        return float(s)
    except ValueError:
        return 0.0

# 3. Seeding Alternatif dari Excel
excel_path = r"d:\DOKUMEN\PTN\ITK\SMT 6\SPK\Sistem\Berkas\Copy of ERROR SAW_Laptop_Kepmendag2060_2025.xlsx"
try:
    wb = openpyxl.load_workbook(excel_path, data_only=True)
    ws = wb["DATA ALTERNATIF"]
    
    imported_count = 0
    # Data dimulai dari baris 5 s.d 79 (75 Laptop)
    for row in range(5, 80):
        vals = [cell.value for cell in ws[row]]
        if not vals[0] or not vals[1]:
            continue
            
        kode = vals[1]
        name = vals[2]
        brand = vals[3]
        
        tkdn_raw = clean_numeric(vals[4])
        ram = clean_numeric(vals[5])
        ssd = clean_numeric(vals[6])
        warranty = clean_numeric(vals[7])
        price = clean_numeric(vals[8])
        
        # Cek apakah sudah ada untuk menghindari duplikat
        exists = db.query(Alternative).filter(Alternative.kode == kode).first()
        if not exists:
            alt = Alternative(
                kode=kode,
                name=name,
                brand=brand,
                c1_tkdn=tkdn_raw,
                c2_ram=ram,
                c3_ssd=ssd,
                c4_warranty=warranty,
                c5_price=price
            )
            db.add(alt)
            imported_count += 1
            
    db.commit()
    print(f"Imported {imported_count} alternatives from Excel successfully.")
except Exception as e:
    print(f"Error importing from Excel: {e}")
finally:
    db.close()
