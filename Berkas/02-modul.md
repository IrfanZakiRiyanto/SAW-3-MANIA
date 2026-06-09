# MODUL 2: BACKEND REST API — FastAPI + PostgreSQL

---

**Mata Kuliah:** Komputasi Awan  
**Program Studi:** Sistem Informasi - Institut Teknologi Kalimantan  
**SKS:** 3 (1 Kuliah + 2 Project)  
**Pertemuan:** 2 dari 16  
**Fase:** 🟢 Foundation (Minggu 1-4)  

---

## Prasyarat

Sebelum memulai pertemuan ini, pastikan:
- [x] Modul 1 selesai: environment terinstall, tim terbentuk di GitHub Classroom
- [x] PostgreSQL **sudah terinstall** di laptop (instruksi di Modul 1 Bagian D4)
- [x] Backend FastAPI hello world berjalan dari Modul 1
- [x] Sudah membaca materi REST API & CRUD (Modul 1 Bagian D4)

> ⚠️ **Belum install PostgreSQL?** Lakukan sekarang sebelum workshop dimulai:  
> Download dari https://www.postgresql.org/download/  
> Catat **username** (default: `postgres`) dan **password** yang Anda buat saat instalasi.

---

## Capaian Pembelajaran

### Sub-CPMK
Setelah menyelesaikan pertemuan ini, mahasiswa mampu:
1. Menjelaskan konsep REST API dan HTTP methods (GET, POST, PUT, DELETE)
2. Merancang dan mengimplementasikan CRUD endpoints menggunakan FastAPI
3. Menghubungkan aplikasi Python ke database PostgreSQL menggunakan SQLAlchemy ORM
4. Menerapkan validasi data menggunakan Pydantic schemas
5. Menguji API menggunakan Swagger UI dan Thunder Client

### Indikator Pencapaian
- Mahasiswa memiliki minimal 4 endpoint CRUD yang berfungsi
- Database PostgreSQL terhubung dan data tersimpan persisten
- API mengembalikan response dengan status code yang tepat
- Swagger UI menampilkan dokumentasi API yang lengkap

---

## Pembagian Fokus Tim Pertemuan Ini

| Peran | Fokus Utama | Juga Membantu |
|-------|-------------|---------------|
| **Lead Backend** | Menulis semua endpoint CRUD & model database | — |
| **Lead Frontend** | Mengikuti & memahami API response format untuk minggu depan | Testing API via Swagger |
| **Lead DevOps** | Setup PostgreSQL, konfigurasi database connection | Buat `.env` file |
| **Lead QA & Docs** | Testing semua endpoint, dokumentasi API behavior | Update README |
| **Lead CI/CD** *(jika 5 orang)* | Setup environment variables & `.env.example` | Bantu testing |

---

# BAGIAN A: PEMBEKALAN TEORI (50 Menit)

## 1. REST API Fundamentals (20 menit)

### 1.1 Apa itu API?

**API (Application Programming Interface)** adalah "kontrak" antara dua software yang mendefinisikan bagaimana mereka berkomunikasi. Dalam konteks web, API memungkinkan frontend berkomunikasi dengan backend melalui HTTP.

> 💡 **Analogi:**  
> API seperti **pelayan di restoran**. Anda (frontend/client) memesan melalui pelayan (API), pelayan menyampaikan ke dapur (backend/server), lalu pelayan membawa makanan (response) kembali ke Anda. Anda tidak perlu tahu cara memasak — cukup tahu cara memesan.

### 1.2 Apa itu REST?

**REST (Representational State Transfer)** adalah arsitektur/gaya desain API yang menggunakan HTTP sebagai protokol komunikasi. REST API mengorganisasi data sebagai **resources** yang bisa diakses via **URL (endpoint)**.

Prinsip utama REST:
1. **Client-Server** — Frontend dan backend terpisah, bisa dikembangkan independen
2. **Stateless** — Setiap request berdiri sendiri, server tidak menyimpan state client
3. **Uniform Interface** — URL yang konsisten dan predictable untuk setiap resource
4. **Resource-Based** — Setiap "hal" (user, product, order) adalah resource dengan URL unik

### 1.3 HTTP Methods & CRUD

```mermaid
flowchart LR
    subgraph CLIENT ["🌐 Client (Frontend/Postman)"]
        REQ[HTTP Request]
    end

    subgraph SERVER ["🖥️ Server (FastAPI)"]
        subgraph METHODS ["HTTP Methods"]
            GET["GET → Read"]
            POST["POST → Create"]
            PUT["PUT → Update"]
            DELETE["DELETE → Delete"]
        end
        DB[(Database)]
    end

    REQ --> GET
    REQ --> POST
    REQ --> PUT
    REQ --> DELETE
    GET --> DB
    POST --> DB
    PUT --> DB
    DELETE --> DB

    style CLIENT fill:#DEEBF7,stroke:#2E75B6
    style SERVER fill:#E2EFDA,stroke:#548235
    style METHODS fill:#FFF2CC,stroke:#BF8F00
```

| HTTP Method | CRUD Operation | Contoh Endpoint | Deskripsi |
|-------------|---------------|-----------------|-----------|
| `GET` | **R**ead | `GET /items` | Ambil semua items |
| `GET` | **R**ead | `GET /items/1` | Ambil item dengan id=1 |
| `POST` | **C**reate | `POST /items` | Buat item baru |
| `PUT` | **U**pdate | `PUT /items/1` | Update item id=1 |
| `DELETE` | **D**elete | `DELETE /items/1` | Hapus item id=1 |

### 1.4 HTTP Status Codes

| Code | Nama | Kapan Digunakan |
|------|------|-----------------|
| `200` | OK | Request berhasil (GET, PUT) |
| `201` | Created | Resource baru berhasil dibuat (POST) |
| `204` | No Content | Berhasil tapi tidak ada data dikembalikan (DELETE) |
| `400` | Bad Request | Data yang dikirim tidak valid |
| `404` | Not Found | Resource tidak ditemukan |
| `422` | Unprocessable Entity | Validasi gagal (FastAPI default) |
| `500` | Internal Server Error | Kesalahan di server |

### 1.5 Contoh Request & Response

```
# Request
POST /items HTTP/1.1
Content-Type: application/json

{
    "name": "Laptop",
    "price": 15000000,
    "description": "Laptop untuk cloud computing"
}

# Response (201 Created)
{
    "id": 1,
    "name": "Laptop",
    "price": 15000000,
    "description": "Laptop untuk cloud computing",
    "created_at": "2026-02-09T10:30:00"
}
```

---

## 2. Database & ORM (15 menit)

### 2.1 Mengapa PostgreSQL?

PostgreSQL adalah database relasional open-source yang:
- Mendukung JSON & data types yang kaya
- Sangat reliable dan production-proven
- Didukung oleh hampir semua cloud provider (Railway, Render, AWS RDS)
- Cocok untuk microservices (setiap service bisa punya database sendiri)

### 2.2 Apa itu ORM?

**ORM (Object-Relational Mapping)** adalah teknik yang memungkinkan kita berinteraksi dengan database menggunakan objek Python, bukan menulis SQL secara langsung.

```mermaid
flowchart LR
    subgraph PYTHON ["🐍 Python Code"]
        OBJ["Item(name='Laptop', price=15000000)"]
    end

    subgraph ORM ["⚙️ SQLAlchemy ORM"]
        TRANSLATE[Translasi otomatis<br/>Python Object ↔ SQL]
    end

    subgraph DB ["🗄️ PostgreSQL"]
        SQL["INSERT INTO items<br/>(name, price)<br/>VALUES ('Laptop', 15000000)"]
    end

    OBJ --> TRANSLATE --> SQL
    SQL -.->|Result| TRANSLATE -.->|Python Object| OBJ

    style PYTHON fill:#FCE4D6,stroke:#BF8F00
    style ORM fill:#DEEBF7,stroke:#2E75B6
    style DB fill:#E2EFDA,stroke:#548235
```

| Tanpa ORM (Raw SQL) | Dengan ORM (SQLAlchemy) |
|----------------------|-------------------------|
| `cursor.execute("INSERT INTO items (name, price) VALUES (%s, %s)", ("Laptop", 15000000))` | `db.add(Item(name="Laptop", price=15000000))` |
| Harus tulis SQL manual | Python object, lebih intuitif |
| Rentan SQL injection jika tidak hati-hati | Aman dari SQL injection by default |
| Tidak portable antar database | Bisa ganti database tanpa ubah kode |

### 2.3 Pydantic — Validasi Data

**Pydantic** adalah library validasi data di Python. Di FastAPI, Pydantic digunakan sebagai **schema** untuk:
- Memvalidasi data yang masuk (request body)
- Mendefinisikan format data yang keluar (response)
- Auto-generate dokumentasi API di Swagger

```mermaid
flowchart LR
    REQ[Request JSON] --> PYDANTIC{Pydantic Schema<br/>Validasi}
    PYDANTIC -->|Valid ✅| FASTAPI[FastAPI Endpoint]
    PYDANTIC -->|Invalid ❌| ERROR["422 Error<br/>+ Detail kesalahan"]
    FASTAPI --> DB[(Database)]
    DB --> RESPONSE[Response JSON]

    style PYDANTIC fill:#FFF2CC,stroke:#BF8F00
    style ERROR fill:#FBE5D6,stroke:#C00000
```

---

## 3. Arsitektur Aplikasi Kita (15 menit)

### 3.1 Struktur File yang Akan Dibangun

```
backend/
├── main.py              # Entry point, FastAPI app
├── database.py          # Koneksi database
├── models.py            # SQLAlchemy models (tabel database)
├── schemas.py           # Pydantic schemas (validasi request/response)
├── crud.py              # Fungsi CRUD (business logic)
├── requirements.txt     # Dependencies
└── .env                 # Environment variables (TIDAK di-commit!)
```

### 3.2 Alur Request dalam Aplikasi

```mermaid
flowchart TD
    CLIENT[🌐 Client<br/>Browser / Thunder Client] -->|HTTP Request| MAIN[main.py<br/>FastAPI Router]
    MAIN -->|Validasi input| SCHEMA[schemas.py<br/>Pydantic Schema]
    SCHEMA -->|Data valid| CRUD[crud.py<br/>Business Logic]
    CRUD -->|SQL via ORM| MODEL[models.py<br/>SQLAlchemy Model]
    MODEL -->|Query| DATABASE[database.py<br/>PostgreSQL Connection]
    DATABASE -->|Data| DB[(🗄️ PostgreSQL)]

    DB -.->|Result| DATABASE
    DATABASE -.->|Python Object| MODEL
    MODEL -.->|Data| CRUD
    CRUD -.->|Response Object| SCHEMA
    SCHEMA -.->|JSON| MAIN
    MAIN -.->|HTTP Response| CLIENT

    style CLIENT fill:#DEEBF7,stroke:#2E75B6
    style MAIN fill:#E2D9F3,stroke:#7B68A5
    style SCHEMA fill:#FFF2CC,stroke:#BF8F00
    style CRUD fill:#FCE4D6,stroke:#BF8F00
    style MODEL fill:#E2EFDA,stroke:#548235
    style DATABASE fill:#E2EFDA,stroke:#548235
```

> 📝 **Kenapa dipisah jadi banyak file?**  
> Ini disebut **Separation of Concerns** — setiap file punya tanggung jawab spesifik. Ketika proyek membesar (terutama di fase microservices minggu 12-14), struktur ini akan sangat membantu karena kode lebih mudah dibaca, di-test, dan di-maintain.

---

## 4. Rangkuman Teori

```mermaid
mindmap
  root((📡 REST API<br/>+ DATABASE))
    REST API
      HTTP Methods
        GET = Read
        POST = Create
        PUT = Update
        DELETE = Delete
      Status Codes
        2xx = Success
        4xx = Client Error
        5xx = Server Error
      Prinsip
        Stateless
        Resource-Based
        Uniform Interface
    Database
      PostgreSQL
        Relational
        Open-source
        Cloud-ready
      SQLAlchemy ORM
        Python Object ↔ SQL
        Aman dari SQL Injection
    FastAPI Stack
      main.py → Router
      schemas.py → Validasi
      crud.py → Logic
      models.py → Database Model
      database.py → Koneksi
```

---

# BAGIAN B: WORKSHOP DI LAB (170 Menit)


## Tujuan Workshop
Membangun backend REST API lengkap dengan CRUD operations yang terhubung ke PostgreSQL.

> ⚠️ **Semua kode di workshop ini dibangun di atas project Modul 1.** Pastikan Anda sudah `git pull` terlebih dahulu.

---

## Workshop 2.1: Setup PostgreSQL & Database (30 menit)

### Langkah 1: Buat Database

Buka terminal/command prompt dan masuk ke PostgreSQL:

```bash
# Login ke PostgreSQL
# Windows: buka pgAdmin atau command prompt
# Mac/Linux:
psql -U postgres
```

Buat database untuk proyek:

```sql
-- Di dalam psql shell
CREATE DATABASE cloudapp;

-- Verifikasi
\l
-- Pastikan 'cloudapp' muncul di daftar

-- Keluar
\q
```

> 💡 **Menggunakan pgAdmin?** Bisa juga buat database via GUI: klik kanan Databases → Create → Database → nama: `cloudapp`

### Langkah 2: Buat File .env

File `.env` menyimpan konfigurasi sensitif yang **TIDAK boleh di-commit ke Git**.

File: `backend/.env`
```
DATABASE_URL=postgresql://postgres:PASSWORD_ANDA@localhost:5432/cloudapp
```

> ⚠️ **Ganti `PASSWORD_ANDA`** dengan password PostgreSQL yang Anda buat saat instalasi!

File: `backend/.env.example` *(ini yang di-commit, sebagai template)*
```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/cloudapp
```

Pastikan `.env` sudah ada di `.gitignore` (seharusnya sudah dari Modul 1):
```bash
# Verifikasi
cat .gitignore | grep .env
# Harus ada baris: .env
```

### Langkah 3: Install Dependencies Baru

Update file: `backend/requirements.txt`
```
fastapi==0.115.0
uvicorn==0.30.0
sqlalchemy==2.0.35
psycopg2-binary==2.9.9
python-dotenv==1.0.1
pydantic[email]==2.9.0
```

Install:
```bash
cd backend
pip install -r requirements.txt
```

> ✅ **Checkpoint:** Semua dependencies terinstall tanpa error.

---

## Workshop 2.2: Database Connection & Models (30 menit)

### Flowchart Koneksi Database

```mermaid
flowchart TD
    ENV[".env<br/>DATABASE_URL"] -->|dibaca oleh| DBPY["database.py<br/>create_engine()"]
    DBPY -->|engine| SESSION["SessionLocal<br/>Database Session"]
    DBPY -->|Base class| MODELS["models.py<br/>SQLAlchemy Models"]
    MODELS -->|create_all()| TABLE["📋 Tabel di PostgreSQL"]
    SESSION -->|dependency injection| ENDPOINTS["main.py<br/>API Endpoints"]

    style ENV fill:#FFF2CC,stroke:#BF8F00
    style DBPY fill:#E2EFDA,stroke:#548235
    style MODELS fill:#DEEBF7,stroke:#2E75B6
    style ENDPOINTS fill:#E2D9F3,stroke:#7B68A5
```

### Langkah 1: Buat database.py

File: `backend/database.py`
```python
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Load environment variables dari .env
load_dotenv()

# Ambil DATABASE_URL dari environment
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL tidak ditemukan di .env!")

# Buat engine (koneksi ke database)
engine = create_engine(DATABASE_URL)

# Buat session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class untuk models
Base = declarative_base()


# Dependency: dapatkan database session
def get_db():
    """
    Dependency injection untuk FastAPI.
    Membuka session saat request masuk, menutup saat selesai.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### Langkah 2: Buat models.py

File: `backend/models.py`
```python
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.sql import func
from database import Base


class Item(Base):
    """
    Model untuk tabel 'items' di database.
    Setiap atribut = satu kolom di tabel.
    """
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    quantity = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<Item(id={self.id}, name='{self.name}', price={self.price})>"
```

> 📝 **Penjelasan kolom:**
> - `id`: Primary key, auto-increment
> - `name`: Nama item, wajib diisi, max 100 karakter
> - `description`: Deskripsi opsional
> - `price`: Harga, wajib diisi
> - `quantity`: Jumlah stok, default 0
> - `created_at`: Otomatis diisi waktu pembuatan
> - `updated_at`: Otomatis diisi waktu update terakhir

---

## Workshop 2.3: Pydantic Schemas (20 menit)

### Mengapa Perlu Schema Terpisah dari Model?

```mermaid
flowchart LR
    subgraph REQUEST ["📥 Request (masuk)"]
        IN["ItemCreate<br/>name, price, description, quantity<br/>(tanpa id, tanpa timestamp)"]
    end

    subgraph DB ["🗄️ Database"]
        MODEL["Item Model<br/>id, name, price, description,<br/>quantity, created_at, updated_at"]
    end

    subgraph RESPONSE ["📤 Response (keluar)"]
        OUT["ItemResponse<br/>id, name, price, description,<br/>quantity, created_at, updated_at"]
    end

    IN -->|Create/Update| DB
    DB -->|Read| OUT

    style REQUEST fill:#FCE4D6,stroke:#BF8F00
    style DB fill:#E2EFDA,stroke:#548235
    style RESPONSE fill:#DEEBF7,stroke:#2E75B6
```

- **Request schema (ItemCreate/ItemUpdate)**: Mendefinisikan data yang dikirim client — TIDAK termasuk `id` dan `created_at` (karena itu diisi server)
- **Response schema (ItemResponse)**: Mendefinisikan data yang dikembalikan ke client — termasuk semua field

File: `backend/schemas.py`
```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# === BASE SCHEMA ===
class ItemBase(BaseModel):
    """Base schema — field yang dipakai untuk create & update."""
    name: str = Field(..., min_length=1, max_length=100, examples=["Laptop"])
    description: Optional[str] = Field(None, examples=["Laptop untuk cloud computing"])
    price: float = Field(..., gt=0, examples=[15000000])
    quantity: int = Field(0, ge=0, examples=[10])


# === CREATE SCHEMA (untuk POST request) ===
class ItemCreate(ItemBase):
    """Schema untuk membuat item baru. Mewarisi semua field dari ItemBase."""
    pass


# === UPDATE SCHEMA (untuk PUT request) ===
class ItemUpdate(BaseModel):
    """
    Schema untuk update item. Semua field optional 
    karena user mungkin hanya ingin update sebagian field.
    """
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    quantity: Optional[int] = Field(None, ge=0)


# === RESPONSE SCHEMA (untuk output) ===
class ItemResponse(ItemBase):
    """Schema untuk response. Termasuk id dan timestamp dari database."""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True  # Agar bisa convert dari SQLAlchemy model


# === LIST RESPONSE (dengan metadata) ===
class ItemListResponse(BaseModel):
    """Schema untuk response list items dengan total count."""
    total: int
    items: list[ItemResponse]
```

> 💡 **Field Validation:**
> - `Field(..., min_length=1)` → wajib diisi, minimal 1 karakter
> - `Field(..., gt=0)` → wajib diisi, harus lebih besar dari 0
> - `Field(0, ge=0)` → default 0, tidak boleh negatif
> - `Optional[str] = None` → opsional, default None

---

## Workshop 2.4: CRUD Functions (30 menit)

File: `backend/crud.py`
```python
from sqlalchemy.orm import Session
from sqlalchemy import or_
from models import Item
from schemas import ItemCreate, ItemUpdate


def create_item(db: Session, item_data: ItemCreate) -> Item:
    """Buat item baru di database."""
    db_item = Item(**item_data.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


def get_items(db: Session, skip: int = 0, limit: int = 20, search: str = None):
    """
    Ambil daftar items dengan pagination & search.
    - skip: jumlah data yang di-skip (untuk pagination)
    - limit: jumlah data per halaman
    - search: cari berdasarkan nama atau deskripsi
    """
    query = db.query(Item)
    
    if search:
        query = query.filter(
            or_(
                Item.name.ilike(f"%{search}%"),
                Item.description.ilike(f"%{search}%")
            )
        )
    
    total = query.count()
    items = query.order_by(Item.created_at.desc()).offset(skip).limit(limit).all()
    
    return {"total": total, "items": items}


def get_item(db: Session, item_id: int) -> Item | None:
    """Ambil satu item berdasarkan ID."""
    return db.query(Item).filter(Item.id == item_id).first()


def update_item(db: Session, item_id: int, item_data: ItemUpdate) -> Item | None:
    """
    Update item berdasarkan ID.
    Hanya update field yang dikirim (bukan None).
    """
    db_item = db.query(Item).filter(Item.id == item_id).first()
    
    if not db_item:
        return None
    
    # Hanya update field yang dikirim (exclude_unset=True)
    update_data = item_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_item, field, value)
    
    db.commit()
    db.refresh(db_item)
    return db_item


def delete_item(db: Session, item_id: int) -> bool:
    """Hapus item berdasarkan ID. Return True jika berhasil."""
    db_item = db.query(Item).filter(Item.id == item_id).first()
    
    if not db_item:
        return False
    
    db.delete(db_item)
    db.commit()
    return True
```

---

## Workshop 2.5: API Endpoints — main.py (40 menit)

### Flowchart Semua Endpoints

```mermaid
flowchart TD
    subgraph ENDPOINTS ["📡 API Endpoints"]
        GET_ALL["GET /items<br/>List semua items<br/>+ pagination + search"]
        GET_ONE["GET /items/{id}<br/>Ambil 1 item"]
        POST_NEW["POST /items<br/>Buat item baru"]
        PUT_UPD["PUT /items/{id}<br/>Update item"]
        DEL_REM["DELETE /items/{id}<br/>Hapus item"]
        HEALTH["GET /health<br/>Health check"]
    end

    subgraph RESPONSES ["📤 Responses"]
        R200["200 OK"]
        R201["201 Created"]
        R204["204 No Content"]
        R404["404 Not Found"]
    end

    GET_ALL --> R200
    GET_ONE --> R200
    GET_ONE --> R404
    POST_NEW --> R201
    PUT_UPD --> R200
    PUT_UPD --> R404
    DEL_REM --> R204
    DEL_REM --> R404

    style ENDPOINTS fill:#DEEBF7,stroke:#2E75B6
    style RESPONSES fill:#E2EFDA,stroke:#548235
```

Update file: `backend/main.py` (ganti seluruh isinya)
```python
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, get_db
from models import Base
from schemas import ItemCreate, ItemUpdate, ItemResponse, ItemListResponse
import crud

# Buat semua tabel di database (jika belum ada)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Cloud App API",
    description="REST API untuk mata kuliah Komputasi Awan — SI ITK",
    version="0.2.0",
)

# CORS
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
    """Endpoint untuk mengecek apakah API berjalan."""
    return {"status": "healthy", "version": "0.2.0"}


# ==================== CRUD ENDPOINTS ====================

@app.post("/items", response_model=ItemResponse, status_code=201)
def create_item(item: ItemCreate, db: Session = Depends(get_db)):
    """
    Buat item baru.
    
    - **name**: Nama item (wajib, 1-100 karakter)
    - **price**: Harga (wajib, > 0)
    - **description**: Deskripsi (opsional)
    - **quantity**: Jumlah stok (default: 0)
    """
    return crud.create_item(db=db, item_data=item)


@app.get("/items", response_model=ItemListResponse)
def list_items(
    skip: int = Query(0, ge=0, description="Jumlah data yang di-skip"),
    limit: int = Query(20, ge=1, le=100, description="Jumlah data per halaman"),
    search: str = Query(None, description="Cari berdasarkan nama/deskripsi"),
    db: Session = Depends(get_db),
):
    """
    Ambil daftar items dengan pagination dan search.
    
    - **skip**: Offset untuk pagination (default: 0)
    - **limit**: Jumlah item per halaman (default: 20, max: 100)
    - **search**: Kata kunci pencarian (opsional)
    """
    return crud.get_items(db=db, skip=skip, limit=limit, search=search)


@app.get("/items/{item_id}", response_model=ItemResponse)
def get_item(item_id: int, db: Session = Depends(get_db)):
    """Ambil satu item berdasarkan ID."""
    item = crud.get_item(db=db, item_id=item_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"Item dengan id={item_id} tidak ditemukan")
    return item


@app.put("/items/{item_id}", response_model=ItemResponse)
def update_item(item_id: int, item: ItemUpdate, db: Session = Depends(get_db)):
    """
    Update item berdasarkan ID.
    Hanya field yang dikirim yang akan di-update (partial update).
    """
    updated = crud.update_item(db=db, item_id=item_id, item_data=item)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Item dengan id={item_id} tidak ditemukan")
    return updated


@app.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    """Hapus item berdasarkan ID."""
    success = crud.delete_item(db=db, item_id=item_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Item dengan id={item_id} tidak ditemukan")
    return None


# ==================== TEAM INFO ====================

@app.get("/team")
def team_info():
    """Informasi tim."""
    return {
        "team": "cloud-team-XX",
        "members": [
            # TODO: Isi dengan data tim Anda
            {"name": "Nama 1", "nim": "NIM1", "role": "Lead Backend"},
            {"name": "Nama 2", "nim": "NIM2", "role": "Lead Frontend"},
            {"name": "Nama 3", "nim": "NIM3", "role": "Lead DevOps"},
            {"name": "Nama 4", "nim": "NIM4", "role": "Lead QA & Docs"},
        ],
    }
```

### Jalankan & Test

```bash
cd backend
uvicorn main:app --reload --port 8000
```

Buka Swagger UI: http://localhost:8000/docs

### Testing via Swagger UI

```mermaid
flowchart TD
    START([🟢 Buka /docs]) --> POST["1️⃣ POST /items<br/>Buat 3 item"]
    POST --> GET_ALL["2️⃣ GET /items<br/>Cek semua item muncul"]
    GET_ALL --> GET_ONE["3️⃣ GET /items/1<br/>Cek item spesifik"]
    GET_ONE --> PUT["4️⃣ PUT /items/1<br/>Update harga"]
    PUT --> VERIFY["5️⃣ GET /items/1<br/>Verifikasi perubahan"]
    VERIFY --> SEARCH["6️⃣ GET /items?search=laptop<br/>Test search"]
    SEARCH --> DELETE["7️⃣ DELETE /items/1<br/>Hapus item"]
    DELETE --> VERIFY2["8️⃣ GET /items/1<br/>Harus 404 Not Found"]
    VERIFY2 --> END([🟢 SEMUA PASS ✅])

    style START fill:#70AD47,color:#fff
    style END fill:#70AD47,color:#fff
```

Ikuti langkah-langkah di atas di Swagger UI:

**1. POST /items** — Buat 3 item:
```json
{"name": "Laptop", "price": 15000000, "description": "Laptop untuk cloud computing", "quantity": 5}
```
```json
{"name": "Mouse Wireless", "price": 250000, "description": "Mouse bluetooth", "quantity": 20}
```
```json
{"name": "Keyboard Mechanical", "price": 1200000, "description": "Keyboard untuk coding", "quantity": 8}
```

**2. GET /items** — Harus mengembalikan 3 items dengan `total: 3`

**3. GET /items/1** — Harus mengembalikan item "Laptop"

**4. PUT /items/1** — Update harga:
```json
{"price": 14000000}
```

**5. GET /items/1** — Harga harus berubah ke 14000000

**6. GET /items?search=laptop** — Harus mengembalikan 1 item

**7. DELETE /items/1** — Harus response 204

**8. GET /items/1** — Harus response 404

> ✅ **Checkpoint:** Semua 8 langkah testing berhasil → backend CRUD lengkap!

---

## Workshop 2.6: Commit & Push (20 menit)

### Struktur File Akhir

```
cloud-team-XX/
├── backend/
│   ├── main.py              ← Updated
│   ├── database.py          ← Baru
│   ├── models.py            ← Baru
│   ├── schemas.py           ← Baru
│   ├── crud.py              ← Baru
│   ├── requirements.txt     ← Updated
│   ├── .env                 ← JANGAN di-commit!
│   └── .env.example         ← Baru, di-commit
├── frontend/
│   └── ... (dari Modul 1)
├── docs/
│   └── ... (member files)
├── .gitignore
└── README.md
```

### Commit

```bash
# Lead Backend commit kode utama
cd cloud-team-XX
git add backend/
git commit -m "feat: add REST API CRUD with PostgreSQL integration

- Add database.py: PostgreSQL connection via SQLAlchemy
- Add models.py: Item model with timestamps
- Add schemas.py: Pydantic validation schemas
- Add crud.py: CRUD operations with search & pagination
- Update main.py: CRUD endpoints with proper status codes
- Add .env.example: database URL template"

git push origin main
```

```bash
# Lead QA & Docs update README
# Tambahkan section baru di README tentang API endpoints
git add README.md
git commit -m "docs: add API endpoints documentation to README"
git push origin main
```

---

# BAGIAN C: TUGAS TERSTRUKTUR (60 Menit)

> 📝 **Kumpulkan sebelum pertemuan 3** via push ke repository tim.

---

## Tugas 2: Tambah Endpoint & Lengkapi Testing

### Pembagian Tugas

| Anggota | Tugas | Detail |
|---------|-------|--------|
| **Lead Backend** | Tambah endpoint `GET /items/stats` | Return: total items, total value (sum of price × quantity), item termahal, item termurah |
| **Lead Frontend** | Buat file `docs/api-test-results.md` | Screenshot/dokumentasi hasil testing semua endpoint via Swagger/Thunder Client |
| **Lead DevOps** | Buat file `backend/.env.example` yang lengkap | Pastikan `.env` ada di `.gitignore`, buat script `setup.sh` sederhana untuk install dependencies |
| **Lead QA & Docs** | Update `README.md` section API | Dokumentasikan semua endpoint: method, URL, request body, response example |
| **Lead CI/CD** *(5 orang)* | Buat file `docs/database-schema.md` | Gambarkan schema database (tabel, kolom, tipe data) dalam format Markdown |

### Contoh Endpoint /items/stats

```python
@app.get("/items/stats")
def items_stats(db: Session = Depends(get_db)):
    """Statistik inventory."""
    items = db.query(Item).all()
    if not items:
        return {"total_items": 0, "total_value": 0, "most_expensive": None, "cheapest": None}
    
    return {
        "total_items": len(items),
        "total_value": sum(i.price * i.quantity for i in items),
        "most_expensive": {"name": max(items, key=lambda x: x.price).name, 
                          "price": max(items, key=lambda x: x.price).price},
        "cheapest": {"name": min(items, key=lambda x: x.price).name,
                    "price": min(items, key=lambda x: x.price).price},
    }
```

### Informasi Pengumpulan

| Item | Keterangan |
|------|------------|
| **Deadline** | Sebelum pertemuan 3 dimulai |
| **Format** | Push ke repository tim di GitHub Classroom |
| **Yang dikumpulkan** | Endpoint `/items/stats` berjalan + dokumentasi + setiap anggota punya commit |
| **Penilaian** | Fungsionalitas endpoint, kelengkapan dokumentasi, setiap anggota punya ≥1 commit |

---

# BAGIAN D: BELAJAR MANDIRI (230 Menit)

> 📚 **Tidak dikumpulkan**, tetapi sangat penting untuk pemahaman.

---

## D1. Membaca Referensi (60 menit)

### Bacaan Wajib
1. **FastAPI Official Tutorial — Path Parameters & Query Parameters**  
   https://fastapi.tiangolo.com/tutorial/path-params/  
   https://fastapi.tiangolo.com/tutorial/query-params/

2. **SQLAlchemy ORM Tutorial**  
   https://docs.sqlalchemy.org/en/20/orm/quickstart.html

### Bacaan Tambahan
- Pydantic V2 Documentation — https://docs.pydantic.dev/latest/
- HTTP Status Codes Reference — https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
- REST API Best Practices — https://restfulapi.net/

---

## D2. Video Tutorial (60 menit)

1. **"FastAPI Full Course"** — freeCodeCamp (YouTube, lihat bagian CRUD: ~30 min)
2. **"SQLAlchemy + FastAPI"** — Pretty Printed (YouTube, ~15 min)
3. **"REST API Explained"** — IBM Technology (YouTube, ~10 min)

---

## D3. Latihan Mandiri (60 menit)

### Soal Pilihan Ganda

**1.** HTTP method yang digunakan untuk mengambil data dari server adalah:
- [ ] a. POST
- [ ] b. GET
- [ ] c. PUT
- [ ] d. DELETE

**2.** Status code 201 menandakan:
- [ ] a. Request berhasil (OK)
- [ ] b. Resource baru berhasil dibuat (Created)
- [ ] c. Resource tidak ditemukan
- [ ] d. Kesalahan server

**3.** Fungsi utama Pydantic di FastAPI adalah:
- [ ] a. Mengelola database connection
- [ ] b. Menangani routing URL
- [ ] c. Validasi dan serialisasi data
- [ ] d. Menjalankan server

**4.** ORM (Object-Relational Mapping) berguna untuk:
- [ ] a. Membuat tampilan frontend
- [ ] b. Berinteraksi dengan database menggunakan objek Python
- [ ] c. Mengelola file statis
- [ ] d. Membuat API documentation

**5.** Apa yang terjadi jika kita mengirim `GET /items/999` dan item tersebut tidak ada?
- [ ] a. Response 200 dengan data kosong
- [ ] b. Response 404 Not Found
- [ ] c. Response 500 Server Error
- [ ] d. Tidak ada response

---

## D4. Persiapan Pertemuan Berikutnya (50 menit)

Pertemuan 3 akan membangun **React frontend** yang mengkonsumsi API ini. Persiapkan:

- Apa itu **React Component** dan **Props**?
- Apa itu **React Hooks** (useState, useEffect)?
- Cara melakukan **fetch API** dari React
- Apa itu **React Router** untuk navigasi halaman?
- Dasar-dasar **CSS/Tailwind** untuk styling

> 💡 **Tip:** Pastikan frontend dari Modul 1 masih bisa dijalankan (`npm run dev`). Minggu depan kita akan mengembangkannya menjadi CRUD interface yang lengkap.

---

---

*Modul ini disusun oleh Aidil Saputra Kirsan, Institut Teknologi Kalimantan.*
