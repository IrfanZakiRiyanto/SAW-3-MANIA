# ☁️ Cloud App - SPK Pemilihan Laptop SAW Fuzzy

Sistem Pendukung Keputusan (SPK) berbasis web untuk menentukan rekomendasi pemilihan laptop menggunakan metode **Fuzzy Simple Additive Weighting (F-SAW)**. Proyek ini dibangun secara bertahap (incremental) sebagai bagian dari tugas mata kuliah **Komputasi Awan (Cloud Computing)**, Program Studi Sistem Informasi - Institut Teknologi Kalimantan.

## 👥 Tim Pengembang
| Nama | NIM | Peran |
|------|-----|-------|
| Irfan | 12345678 | Lead Developer / Backend & Frontend |

## 🛠️ Tech Stack
*   **Backend:** Python 3.13+ + FastAPI
*   **Frontend:** React.js 18+ + Vite + Tailwind CSS
*   **Database:** PostgreSQL (Mulai Modul 2)
*   **Version Control:** Git & GitHub

## 🏗️ Architecture Overview
```
[React Frontend (Vite)] <--- HTTP (CORS) ---> [FastAPI Backend] <--- SQL ---> [PostgreSQL DB]
       (Port 5173)                                 (Port 8000)
```

## 🚀 Getting Started

### Prasyarat
Sebelum memulai, pastikan laptop Anda sudah memiliki:
*   Python 3.10+
*   Node.js 18+
*   Git

---

### Langkah-Langkah Menjalankan Proyek Secara Lokal

#### 1. Jalankan Backend (FastAPI)
Buka terminal baru di folder proyek `Sistem/backend/`:
```bash
# Masuk ke direktori backend
cd backend

# Buat virtual environment (jika belum ada)
python -m venv venv

# Aktifkan virtual environment (Windows PowerShell)
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Jalankan server FastAPI
uvicorn main:app --reload --port 8000
```
API docs (Swagger UI) dapat diakses melalui: **`http://localhost:8000/docs`**

#### 2. Jalankan Frontend (React + Vite)
Buka terminal baru di folder proyek `Sistem/frontend/`:
```bash
# Masuk ke direktori frontend
cd frontend

# Install dependencies
npm install

# Jalankan server development React
npm run dev
```
Aplikasi web dapat diakses melalui: **`http://localhost:5173`**

---

## 📅 Proyek Roadmap
*   [x] **Fase 1: Setup Awal & Hello World** (Setup FastAPI, React, Tailwind CSS, Integrasi API Lokal)
*   [ ] **Fase 2: REST API + Database PostgreSQL** (CRUD Alternatif, Kriteria, User)
*   [ ] **Fase 3: React Frontend Views** (UI CRUD, Halaman Perhitungan)
*   [ ] **Fase 4: Full-Stack Integration** (Integrasi Frontend dengan Backend DB)
*   [ ] **Fase 5-7: Docker & Containerization** (Containerizing App)
