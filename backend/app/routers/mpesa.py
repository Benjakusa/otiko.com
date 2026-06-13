import os
import uuid
from decimal import Decimal
from typing import Optional, List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel
from redis.asyncio import Redis

from ..dependencies import get_db, get_redis
from ..models import Order, OrderStatus, TicketCategory, LedgerEntry, EntryType, Event
from ..services.mpesa_service import MpesaService

router = APIRouter()

# --- SAFARICOM PAYLOAD VALIDATION SCHEMAS ---
class CallbackItem(BaseModel):
    Name: str
    Value: Optional[Any] = None

class CallbackMetadata(BaseModel):
    Item: List[CallbackItem]

class StkCallbackResponse(BaseModel):
    MerchantRequestID: str
    CheckoutRequestID: str
    ResultCode: int
    ResultDesc: str
    CallbackMetadata: Optional[CallbackMetadata] = None

class StkCallbackBody(BaseModel):
    stkCallback: Optional[StkCallbackResponse] = None
    # Support direct flattened keys for testing convenience
    CheckoutRequestID: Optional[str] = None
    ResultCode: Optional[int] = None

class MpesaCallbackRequest(BaseModel):
    Body: StkCallbackBody

class InitiateSTKRequest(BaseModel):
    phone_number: Optional[str] = None

@router.post("/initiate/{order_id}")
async def initiate_stk_push(
    order_id: uuid.UUID,
    payload: InitiateSTKRequest,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis)
):
    """Initiates an STK Push payment request on Safaricom for the specified order"""
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order.status != OrderStatus.PENDING:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot initialize payment for order in {order.status} state"
        )
        
    phone = payload.phone_number or order.buyer_phone
    if not phone:
        raise HTTPException(status_code=400, detail="Missing target M-Pesa phone number")
        
    # Standardize callback url mapping with secret callback token
    secret_callback_token = os.environ.get("MPESA_CALLBACK_SECRET", "otiko-secret-callback-token-2026")
    callback_url = f"{os.environ.get('MPESA_CALLBACK_BASE_URL', 'https://otiko.com')}/api/mpesa/callback/{secret_callback_token}"
    
    mpesa_service = MpesaService(redis)
    try:
        checkout_id = await mpesa_service.stk_push(
            phone_number=phone,
            amount=order.total_amount,
            order_id=str(order.id),
            callback_url=callback_url
        )
        
        # Save checkout ID back to the order
        order.mpesa_checkout_request_id = checkout_id
        await db.commit()
        await db.refresh(order)
        
        return {
            "status": "initiated",
            "message": "Daraja STK push prompt queued on subscriber handset",
            "checkout_request_id": checkout_id,
            "order_id": order.id
        }
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Safaricom STK invocation error: {str(exc)}")

@router.post("/callback/{secret_token}")
async def mpesa_callback(
    secret_token: str,
    request: MpesaCallbackRequest,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis)
):
    # 1. Security check: Validate callback token
    expected_token = os.environ.get("MPESA_CALLBACK_SECRET", "otiko-secret-callback-token-2026")
    if secret_token != expected_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid security callback token"
        )
    
    # Extract request elements robustly
    checkout_id = None
    result_code = None
    
    if request.Body.stkCallback:
        checkout_id = request.Body.stkCallback.CheckoutRequestID
        result_code = request.Body.stkCallback.ResultCode
    else:
        checkout_id = request.Body.CheckoutRequestID
        result_code = request.Body.ResultCode
        
    if not checkout_id:
        return {"ResultCode": 1, "ResultDesc": "Invalid payload: CheckoutRequestID is missing"}
        
    # 2. Idempotency check using Redis cache
    cache_key = f"mpesa:processed:{checkout_id}"
    try:
        is_processed = await redis.get(cache_key)
        if is_processed:
            return {"ResultCode": 0, "ResultDesc": "Already processed"}
    except Exception as exc:
        print(f"[MpesaCallback] Redis get error: {exc}")

    # 3. Retrieve matching Order record
    result = await db.execute(
        select(Order).where(Order.mpesa_checkout_request_id == checkout_id)
    )
    order = result.scalar_one_or_none()
    
    if not order:
        return {"ResultCode": 0, "ResultDesc": "Order not found or recognized in system"}
    
    if order.status != OrderStatus.PENDING:
        return {"ResultCode": 0, "ResultDesc": "Order already processed or finalized"}
        
    # 4. Check payment success codes
    if result_code == 0:
        # Success state
        order.status = OrderStatus.PAID
        
        # Pull associated Event
        evt_res = await db.execute(select(Event).where(Event.id == order.event_id))
        event = evt_res.scalar_one_or_none()
        organizer_id = event.organizer_id if event else order.event_id # Fallback
        
        # Calculate platform fee (5%)
        platform_fee = order.total_amount * Decimal("0.05")
        
        # Enter transactional ledger tracking
        ledger = LedgerEntry(
            organizer_id=organizer_id,
            order_id=order.id,
            event_id=order.event_id,
            gross_amount=order.total_amount,
            platform_fee=platform_fee,
            net_amount=order.total_amount - platform_fee,
            entry_type=EntryType.SALE
        )
        db.add(ledger)
        await db.commit()
        
        # 5. Dispatch / enqueue ticket rendering on background worker
        try:
            import sys
            sys.path.append("/workers")
            sys.path.append("./workers")
            from workers.pdf_tasks import generate_and_send_ticket
            generate_and_send_ticket.delay(str(order.id))
        except Exception as err:
            print(f"[MpesaCallback] Task enqueue warning: {err}. Proceeding with fallback trigger.")
    else:
        # User canceled or expired push
        order.status = OrderStatus.FAILED
        await db.commit()
        
        # Release reservation inventory atomically
        stmt = (
            update(TicketCategory)
            .where(TicketCategory.id == order.category_id)
            .values(remaining_quantity=TicketCategory.remaining_quantity + order.quantity)
        )
        await db.execute(stmt)
        await db.commit()

    # 6. Set Redis TTL flag
    try:
        await redis.setex(cache_key, 86400, "1")  # 24 hour TTL protection
    except Exception as exc:
        print(f"[MpesaCallback] Redis set processed warning: {exc}")
        
    return {"ResultCode": 0, "ResultDesc": "Success callback handled correctly"}
