from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import redis.asyncio as aioredis
from datetime import datetime, timezone

from ..schemas import ReservationRequest, OrderResponse
from ..dependencies import get_db, get_redis
from ..models.event import Event, EventStatus
from ..models.ticket_category import TicketCategory
from ..utils.rate_limiter import RateLimiter
from ..services.reservation_service import ReservationService, InsufficientInventoryError

router = APIRouter()

@router.post("/reserve", response_model=OrderResponse)
async def reserve_tickets(
    request: ReservationRequest,
    db: AsyncSession = Depends(get_db),
    redis_client: aioredis.Redis = Depends(get_redis)
):
    """
    Highly parallelizable endpoint designed to handle flash-sale ticket reservation spikes.
    Applies strict rate limiting per phone number first before doing row-level database transactions.
    """
    # 1. Apply rate limit
    limiter = RateLimiter(redis_client)
    limit_key = f"phone:{request.buyer_phone}"
    is_allowed = await limiter.check_limit(limit_key, max_requests=2, window_seconds=15)
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many purchase attempts from this phone. Please wait 15 seconds."
        )

    # 2. Retrieve corresponding Category in memory first to validate Event state
    stmt_cat = select(TicketCategory).where(TicketCategory.id == request.category_id)
    cat_result = await db.execute(stmt_cat)
    category = cat_result.scalar_one_or_none()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket category does not exist."
        )

    # 3. Retrieve and validate Event constraints
    stmt_evt = select(Event).where(Event.id == category.event_id)
    evt_result = await db.execute(stmt_evt)
    event = evt_result.scalar_one_or_none()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event associated with category was not found."
        )

    if event.status != EventStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Event is not active or is restricted."
        )

    if event.event_date < datetime.now(timezone.utc).replace(tzinfo=None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Event has already passed. Tickets are no longer on sale."
        )

    # 4. Invoke Atomic Reservation safe transaction
    reservation_service = ReservationService(db, redis_client)
    try:
        order = await reservation_service.reserve_tickets(
            category_id=request.category_id,
            quantity=request.quantity,
            buyer_name=request.buyer_name,
            buyer_phone=request.buyer_phone,
            buyer_email=request.buyer_email
        )
        return OrderResponse(
            order_id=order.id,
            status=order.status.value,
            expires_at=order.expires_at,
            total_amount=order.total_amount
        )
    except InsufficientInventoryError as err:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(err)
        )

@router.post("/release-expired")
async def release_expired(
    db: AsyncSession = Depends(get_db),
    redis_client: aioredis.Redis = Depends(get_redis)
):
    """
    Exposes manual sweeper triggers.
    In production environments, this can be called via a Cron Trigger, Celery, or system process.
    """
    service = ReservationService(db, redis_client)
    released_count = await service.release_expired_reservations()
    return {
        "status": "success",
        "released_reservations_count": released_count
    }
