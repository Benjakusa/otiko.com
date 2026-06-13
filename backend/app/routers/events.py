from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid

from ..schemas import EventCreate, EventResponse
from ..dependencies import get_current_organizer, get_db
from ..models.organizer import Organizer
from ..models.event import Event, EventStatus
from ..models.ticket_category import TicketCategory
from ..services.event_service import EventService

router = APIRouter()

@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    event_in: EventCreate,
    current_org: Organizer = Depends(get_current_organizer),
    db: AsyncSession = Depends(get_db)
):
    """Enables verified organizers to create events and customize multiple ticket rates"""
    event = await EventService.create_event(db, current_org.id, event_in)
    
    # Grab child categories for response mapping format consistency
    stmt_cats = select(TicketCategory).where(TicketCategory.event_id == event.id)
    cats_res = await db.execute(stmt_cats)
    categories_list = list(cats_res.scalars().all())
    
    # Convert directly
    response_evt = EventResponse.model_validate(event, from_attributes=True)
    response_evt.categories = categories_list
    return response_evt

@router.get("", response_model=List[EventResponse])
async def list_public_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Returns a paginated grid list of public music concerts / active tickets"""
    stmt = (
        select(Event)
        .where(Event.status == EventStatus.ACTIVE)
        .order_by(Event.event_date.asc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    events = result.scalars().all()
    
    response_list = []
    for evt in events:
        stmt_cats = select(TicketCategory).where(TicketCategory.event_id == evt.id)
        cats_res = await db.execute(stmt_cats)
        
        evt_resp = EventResponse.model_validate(evt, from_attributes=True)
        evt_resp.categories = list(cats_res.scalars().all())
        response_list.append(evt_resp)
        
    return response_list

@router.get("/{event_code}", response_model=EventResponse)
async def get_event_by_code(
    event_code: str,
    db: AsyncSession = Depends(get_db)
):
    """Retrieve individual event details by its active unique referral shortcode"""
    stmt = select(Event).where(Event.event_code == event_code)
    result = await db.execute(stmt)
    event = result.scalar_one_or_none()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event with requested code does not exist"
        )
        
    stmt_cats = select(TicketCategory).where(TicketCategory.event_id == event.id)
    cats_res = await db.execute(stmt_cats)
    
    evt_resp = EventResponse.model_validate(event, from_attributes=True)
    evt_resp.categories = list(cats_res.scalars().all())
    return evt_resp
