from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
import uuid

# --- ORGANIZER SCHEMAS ---
class OrganizerResponse(BaseModel):
    id: uuid.UUID
    firebase_uid: str
    name: str
    email: str
    phone: Optional[str] = None
    business_name: Optional[str] = None
    kyc_status: str
    mpesa_payout_number: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class KYCUploadRequest(BaseModel):
    business_name: str = Field(..., min_length=1, max_length=200)
    mpesa_payout_number: str = Field(..., pattern=r"^254\d{9}$")

class OrganizerRegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    business_name: str = Field(..., min_length=1, max_length=200)
    mpesa_payout_number: str = Field(..., pattern=r"^254\d{9}$")

# --- TICKET CATEGORY SCHEMAS ---
class TicketCategoryCreate(BaseModel):
    name: str = Field(..., max_length=100, example="Regular Pass")
    price: Decimal = Field(..., gt=0)
    total_quantity: int = Field(..., gt=0)

class TicketCategoryResponse(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    name: str
    price: Decimal
    total_quantity: int
    remaining_quantity: int

    class Config:
        from_attributes = True

# --- EVENT SCHEMAS ---
class EventCreate(BaseModel):
    name: str = Field(..., max_length=255)
    flyer_url: Optional[str] = None
    event_date: datetime
    venue: str = Field(..., max_length=255)
    description: Optional[str] = None
    categories: List[TicketCategoryCreate]

class EventResponse(BaseModel):
    id: uuid.UUID
    event_code: str
    name: str
    flyer_url: Optional[str] = None
    event_date: datetime
    venue: str
    description: Optional[str] = None
    status: str
    created_at: datetime
    categories: List[TicketCategoryResponse] = []

    class Config:
        from_attributes = True

# --- ORDER / RESERVATION SCHEMAS ---
class ReservationRequest(BaseModel):
    category_id: uuid.UUID
    quantity: int = Field(..., ge=1, le=10)
    buyer_name: str = Field(..., min_length=2, max_length=100)
    buyer_phone: str = Field(..., pattern=r"^(2547|2541|07|01)\d{8}$")
    buyer_email: EmailStr

class OrderResponse(BaseModel):
    order_id: uuid.UUID
    status: str
    expires_at: datetime
    total_amount: Decimal

    class Config:
        from_attributes = True

# --- PAYOUT SCHEMAS ---
class PayoutRequest(BaseModel):
    amount: Decimal = Field(..., ge=100)

class PayoutResponse(BaseModel):
    payout_id: uuid.UUID
    amount: Decimal
    phone_number: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
