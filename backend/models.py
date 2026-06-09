from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}')>"

class Alternative(Base):
    __tablename__ = "alternatives"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    kode = Column(String(10), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False)
    brand = Column(String(50), nullable=False)
    c1_tkdn = Column(Float, nullable=False)       # Nilai TKDN + BMP (%)
    c2_ram = Column(Float, nullable=False)        # RAM (GB)
    c3_ssd = Column(Float, nullable=False)        # SSD (GB)
    c4_warranty = Column(Float, nullable=False)   # Garansi (Thn)
    c5_price = Column(Float, nullable=False)      # Harga (Rp)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<Alternative(id={self.id}, kode='{self.kode}', name='{self.name}')>"

class Criterion(Base):
    __tablename__ = "criteria"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    kode = Column(String(10), unique=True, nullable=False, index=True) # C1, C2, C3, C4, C5
    name = Column(String(100), nullable=False)
    type = Column(String(20), nullable=False) # Benefit or Cost
    weight = Column(Float, nullable=False)    # Bobot kriteria (misal: 0.30)

    def __repr__(self):
        return f"<Criterion(kode='{self.kode}', name='{self.name}', weight={self.weight})>"
