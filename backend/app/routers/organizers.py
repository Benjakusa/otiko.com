from fastapi import APIRouter, Depends, HTTPException, status
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
import uuid

from ..schemas import OrganizerResponse, KYCUploadRequest, OrganizerRegisterRequest
from ..dependencies import get_current_organizer, get_db
from ..models.organizer import Organizer, KYCStatus
from ..middleware.rate_limit import limiter

router = APIRouter()

@router.post("/signup", response_model=OrganizerResponse)
@limiter.limit("5/minute")
async def signup_organizer(
    fast_req: Request,
    body: OrganizerRegisterRequest,
    current_org: Organizer = Depends(get_current_organizer),
    db: AsyncSession = Depends(get_db)
):
    """Register or customize the active developer client account setting enterprise specifics"""
    stmt = (
        update(Organizer)
        .where(Organizer.id == current_org.id)
        .values(
            name=body.name,
            email=body.email,
            business_name=body.business_name,
            mpesa_payout_number=body.mpesa_payout_number
        )
    )
    await db.execute(stmt)
    await db.commit()
    
    # Reload model and return
    stmt_reload = select(Organizer).where(Organizer.id == current_org.id)
    res = await db.execute(stmt_reload)
    return res.scalar_one()

@router.get("/me", response_model=OrganizerResponse)
@limiter.limit("30/minute")
async def get_profile(
    fast_req: Request,
    current_org: Organizer = Depends(get_current_organizer)
):
    """Returns the organizer workspace details"""
    return current_org

@router.post("/upload-kyc", response_model=OrganizerResponse)
@limiter.limit("5/minute")
async def upload_kyc(
    fast_req: Request,
    body: KYCUploadRequest,
    current_org: Organizer = Depends(get_current_organizer),
    db: AsyncSession = Depends(get_db)
):
    """Submit business regulatory KYC details. Updates state to verified on approval"""
    stmt = (
        update(Organizer)
        .where(Organizer.id == current_org.id)
        .values(
            business_name=body.business_name,
            mpesa_payout_number=body.mpesa_payout_number,
            kyc_status=KYCStatus.VERIFIED  # Sandbox flow automatically verifies for fast iteration
        )
    )
    await db.execute(stmt)
    await db.commit()
    
    # Reload model
    stmt_reload = select(Organizer).where(Organizer.id == current_org.id)
    res = await db.execute(stmt_reload)
    return res.scalar_one()
