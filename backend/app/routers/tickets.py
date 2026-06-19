import os
import hmac
import hashlib
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..dependencies import get_current_organizer, get_db
from ..models import Organizer, Ticket, TicketStatus, Event, Order

router = APIRouter()

def generate_qr_signature(ticket_id: str, ticket_number: int) -> str:
    """Re-creates the HMAC-SHA256 signature to prevent ticket forgery"""
    signing_secret = os.environ.get("QR_SIGNING_SECRET")
    if not signing_secret:
        raise RuntimeError("QR_SIGNING_SECRET environment variable is not set")
    secret = signing_secret.encode()
    message = f"{ticket_id}:{ticket_number}".encode()
    return hmac.new(secret, message, hashlib.sha256).hexdigest()[:32]

@router.post("/{ticket_id}/verify")
async def verify_ticket(
    ticket_id: uuid.UUID,
    organizer: Organizer = Depends(get_current_organizer),
    db: AsyncSession = Depends(get_db)
):
    """
    Gate-keeper venue scanner endpoint.
    Performs secure verification check and updates ticket check-in status on pass.
    """
    # Join queries Event and Ticket safely
    stmt = (
        select(Ticket, Event)
        .join(Event, Ticket.event_id == Event.id)
        .where(Ticket.id == ticket_id)
    )
    result = await db.execute(stmt)
    row = result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found or recognized in the Otiko secure registry"
        )
        
    ticket, event = row
    
    # Verify scanning organizer owns the parent event
    if event.organizer_id != organizer.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to scan or check-in tickets for this event"
        )
        
    # Recalculate and validate HMAC security signature to detect spoofed/forged layouts
    expected_sig = generate_qr_signature(str(ticket.id), ticket.ticket_number)
    if ticket.qr_signature != expected_sig:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="QR ticket signature validation failed - possible forgery attempt detected"
        )
        
    # Check ticket state
    if ticket.status == TicketStatus.USED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ticket already checked in and used on {ticket.used_at.isoformat() if ticket.used_at else 'unknown date'}"
        )
        
    if ticket.status == TicketStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This ticket has been cancelled / refunded"
        )
        
    # Fetch original purchaser name for welcome banner display
    order_stmt = select(Order).where(Order.id == ticket.order_id)
    order_res = await db.execute(order_stmt)
    order = order_res.scalar_one_or_none()
    buyer_name = order.buyer_name if order else "Valued Guest"
    
    # Mark ticketeer as scanned & updated
    ticket.status = TicketStatus.USED
    ticket.used_at = datetime.utcnow()
    await db.commit()
    
    return {
        "valid": True,
        "message": "Access granted! Welcome to the event.",
        "event_name": event.name,
        "ticket_number": ticket.ticket_number,
        "buyer_name": buyer_name,
        "used_at": ticket.used_at.isoformat()
    }
