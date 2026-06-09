from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# ==================== USER SCHEMAS ====================
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, examples=["irfan"])

class UserCreate(UserBase):
    password: str = Field(..., min_length=4, examples=["secret123"])

class UserLogin(UserBase):
    password: str = Field(..., min_length=4)

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ==================== ALTERNATIVE SCHEMAS ====================
class AlternativeBase(BaseModel):
    kode: str = Field(..., min_length=2, max_length=10, examples=["A01"])
    name: str = Field(..., min_length=2, max_length=150, examples=["Lenovo IdeaPad Slim 3 15IAH8"])
    brand: str = Field(..., min_length=2, max_length=50, examples=["Lenovo"])
    c1_tkdn: float = Field(..., ge=0, le=100, examples=[41.5])
    c2_ram: float = Field(..., ge=1, examples=[8.0])
    c3_ssd: float = Field(..., ge=1, examples=[512.0])
    c4_warranty: float = Field(..., ge=0.5, examples=[1.0])
    c5_price: float = Field(..., gt=0, examples=[13722375.0])

class AlternativeCreate(AlternativeBase):
    pass

class AlternativeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    brand: Optional[str] = Field(None, min_length=2, max_length=50)
    c1_tkdn: Optional[float] = Field(None, ge=0, le=100)
    c2_ram: Optional[float] = Field(None, ge=1)
    c3_ssd: Optional[float] = Field(None, ge=1)
    c4_warranty: Optional[float] = Field(None, ge=0.5)
    c5_price: Optional[float] = Field(None, gt=0)

class AlternativeResponse(AlternativeBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ==================== CRITERION SCHEMAS ====================
class CriterionBase(BaseModel):
    kode: str
    name: str
    type: str
    weight: float

class CriterionUpdate(BaseModel):
    weight: float = Field(..., ge=0, le=1, description="Bobot kriteria (0 s.d 1)")

class CriterionResponse(CriterionBase):
    id: int

    class Config:
        from_attributes = True

# ==================== SAW CALCULATION RESPONSE SCHEMAS ====================
class FuzzyMatrixRow(BaseModel):
    kode: str
    name: str
    f_c1: float
    f_c2: float
    f_c3: float
    f_c4: float
    f_c5: float

class NormalizedMatrixRow(BaseModel):
    kode: str
    name: str
    r_c1: float
    r_c2: float
    r_c3: float
    r_c4: float
    r_c5: float

class PreferenceRow(BaseModel):
    rank: int
    kode: str
    name: str
    brand: str
    v_i: float
    keterangan: str

class SAWCalculationResult(BaseModel):
    criteria: List[CriterionResponse]
    fuzzy_matrix: List[FuzzyMatrixRow]
    normalized_matrix: List[NormalizedMatrixRow]
    preferences: List[PreferenceRow]
