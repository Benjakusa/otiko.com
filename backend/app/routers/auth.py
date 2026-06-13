from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from ..schemas import OrganizerResponse
from ..dependencies import get_current_organizer, get_db
from ..models.organizer import Organizer

router = APIRouter()

@router.get("/me", response_model=OrganizerResponse)
async def get_my_profile(
    current_org: Organizer = Depends(get_current_organizer)
):
    """Get the currently logged-in authenticated organizer profile parsed from the Firebase token"""
    return current_org
