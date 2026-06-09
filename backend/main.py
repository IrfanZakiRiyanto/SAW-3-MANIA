from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="SPK SAW Laptop API",
    description="API Backend untuk Sistem Pendukung Keputusan Pemilihan Laptop Metode SAW",
    version="0.1.0"
)

# Konfigurasi CORS agar frontend (React) dapat mengakses API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Port default Vite
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "message": "Welcome to SPK SAW Laptop API!",
        "status": "running",
        "version": "0.1.0"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/team")
def team_info():
    return {
        "team": "SPK Laptop Team",
        "members": [
            {"name": "Irfan", "nim": "12345678", "role": "Lead Developer"}
        ]
    }
