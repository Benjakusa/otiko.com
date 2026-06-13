import uuid
import secrets
from string import ascii_uppercase, digits
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from ..models.event import Event, EventStatus
from ..models.ticket_category import TicketCategory
from ..schemas import EventCreate

class EventService:
    @staticmethod
    def generate_event_code() -> str:
        """Generates an elegant, distinctive 8-character unique alphanumeric referral code uppercase"""
        alphabet = ascii_uppercase + digits
        return "OTI-" + "".join(secrets.choice(alphabet) for _ in range(6))

    @classmethod
    async def create_event(
        cls, 
        db: AsyncSession, 
        organizer_id: uuid.UUID, 
        event_in: EventCreate
    ) -> Event:
        """Create a new event alongside its children ticket category bands inside a single transaction"""
        event_code = cls.generate_event_code()
        
        event = Event(
            event_code=event_code,
            organizer_id=organizer_id,
            name=event_in.name,
            flyer_url=event_in.flyer_url,
            event_date=event_in.event_date,
            venue=event_in.venue,
            description=event_in.description,
            status=EventStatus.ACTIVE  # Default auto-activated
        )
        
        db.add(event)
        await db.flush()  # flushes to populate event.id
        
        for cat_data in event_in.categories:
            category = TicketCategory(
                event_id=event.id,
                name=cat_data.name,
                price=cat_data.price,
                total_quantity=cat_data.total_quantity,
                remaining_quantity=cat_data.total_quantity
            )
            db.add(category)
            
        await db.commit()
        await db.refresh(event)
        return event
