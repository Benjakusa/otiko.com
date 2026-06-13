from sqlalchemy import update, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta
import redis.asyncio as aioredis
import uuid

from ..models.order import Order, OrderStatus
from ..models.ticket_category import TicketCategory

class InsufficientInventoryError(Exception):
    """Custom exception raised when ticket category runs out of passes"""
    pass

class ReservationService:
    def __init__(self, db: AsyncSession, redis_client: aioredis.Redis):
        self.db = db
        self.redis = redis_client
    
    async def reserve_tickets(
        self, 
        category_id: uuid.UUID, 
        quantity: int,
        buyer_name: str,
        buyer_phone: str,
        buyer_email: str
    ) -> Order:
        """Atomic reservation with row-level locking - NO OVERSELLING"""
        # Step 1: Atomic database decrement. This updates ticket categories ONLY if sufficient remaining.
        stmt = (
            update(TicketCategory)
            .where(
                TicketCategory.id == category_id,
                TicketCategory.remaining_quantity >= quantity
            )
            .values(remaining_quantity=TicketCategory.remaining_quantity - quantity)
            .returning(TicketCategory.id, TicketCategory.price, TicketCategory.event_id)
        )
        
        result = await self.db.execute(stmt)
        updated = result.first()
        if not updated:
            raise InsufficientInventoryError("Not enough tickets available in specified category.")
        
        category_price = updated[1]
        event_id = updated[2]
        
        # Step 2: Create order with 5-minute expiry
        order = Order(
            event_id=event_id,
            category_id=category_id,
            buyer_name=buyer_name,
            buyer_phone=buyer_phone,
            buyer_email=buyer_email,
            quantity=quantity,
            unit_price=category_price,
            total_amount=category_price * quantity,
            expires_at=datetime.utcnow() + timedelta(minutes=5),
            status=OrderStatus.PENDING
        )
        
        self.db.add(order)
        await self.db.commit()
        await self.db.refresh(order)
        
        # Step 3: Set order idempotency / reservation monitor in Redis (expires in 5 minutes)
        await self.redis.setex(
            f"order:{order.id}:pending",
            300,  # 5 minutes
            str(category_id)
        )
        
        return order
    
    async def release_expired_reservations(self) -> int:
        """Sweeper task - runs every minute to restore inventory for expired, unpaid reservations"""
        # Use Postgres FOR UPDATE SKIP LOCKED to prevent multiple workers from stepping on each other
        expire_query = select(Order.id, Order.category_id, Order.quantity).where(
            Order.status == OrderStatus.PENDING,
            Order.expires_at < datetime.utcnow()
        ).with_for_update(skip_locked=True)
        
        orders_result = await self.db.execute(expire_query)
        expired_records = orders_result.all()
        
        if not expired_records:
            return 0
            
        counter = 0
        for order_id, category_id, quantity in expired_records:
            # 1. Update the category to restore inventory
            restore_stmt = (
                update(TicketCategory)
                .where(TicketCategory.id == category_id)
                .values(remaining_quantity=TicketCategory.remaining_quantity + quantity)
            )
            await self.db.execute(restore_stmt)
            
            # 2. Set individual order status to expired
            order_update = (
                update(Order)
                .where(Order.id == order_id)
                .values(status=OrderStatus.EXPIRED)
            )
            await self.db.execute(order_update)
            
            # 3. Clean up Redis cache key
            await self.redis.delete(f"order:{order_id}:pending")
            counter += 1
            
        await self.db.commit()
        return counter
