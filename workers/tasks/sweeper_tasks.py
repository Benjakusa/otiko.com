import os
import sys
import asyncio
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy import select, update

# Configure module paths
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
sys.path.append("/backend")

from workers.tasks import app

async def run_release_expired_reservations():
    """Asynchronous runner to release blockaged reservation tickets"""
    from app.database import AsyncSessionLocal
    from app.dependencies import settings
    import redis.asyncio as aioredis
    from app.services.reservation_service import ReservationService
    
    redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    async with AsyncSessionLocal() as db:
        try:
            service = ReservationService(db, redis_client)
            count = await service.release_expired_reservations()
            print(f"[Sweeper Beat] Released {count} expired ticket reservations successfully.")
        except Exception as e:
            print(f"[Sweeper Beat Error] Failed releasing reservations: {e}")
        finally:
            await redis_client.aclose()

async def run_reconcile_pending_orders():
    """Asynchronous runner to query Safaricom status for stuck pending orders"""
    from app.database import AsyncSessionLocal
    from app.dependencies import settings
    import redis.asyncio as aioredis
    from app.models.order import Order, OrderStatus
    from app.models import Ticket, TicketStatus, LedgerEntry, EntryType, Event
    from app.models.ticket_category import TicketCategory
    from app.services.mpesa_service import MpesaService
    
    redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    mpesa = MpesaService(redis_client)
    
    async with AsyncSessionLocal() as db:
        try:
            # Query orders stuck in pending state that are older than 5 minutes and have M-Pesa checkouts
            cutoff_time = datetime.utcnow() - timedelta(minutes=5)
            stmt = select(Order).where(
                Order.status == OrderStatus.PENDING,
                Order.mpesa_checkout_request_id.isnot(None),
                Order.created_at <= cutoff_time
            )
            res = await db.execute(stmt)
            orders = res.scalars().all()
            
            for order in orders:
                print(f"[Reconciler Beat] Querying status for checkout {order.mpesa_checkout_request_id} of order {order.id}")
                status_data = await mpesa.query_status(order.mpesa_checkout_request_id)
                result_code = status_data.get("ResultCode", 99)
                result_code_int = int(result_code) if str(result_code).isdigit() else 99
                
                if result_code_int == 0 or status_data.get("ResponseCode") == "0":
                    # Order is paid, transition of status
                    order.status = OrderStatus.PAID
                    
                    # Fetch parent event
                    evt_stmt = select(Event).where(Event.id == order.event_id)
                    evt_res = await db.execute(evt_stmt)
                    event = evt_res.scalar_one_or_none()
                    organizer_id = event.organizer_id if event else order.event_id
                    
                    # Log Ledger entries
                    fee = order.total_amount * Decimal("0.05")
                    ledger = LedgerEntry(
                        organizer_id=organizer_id,
                        order_id=order.id,
                        event_id=order.event_id,
                        gross_amount=order.total_amount,
                        platform_fee=fee,
                        net_amount=order.total_amount - fee,
                        entry_type=EntryType.SALE
                    )
                    db.add(ledger)
                    await db.commit()
                    
                    # Trigger tickets spawning
                    try:
                        from workers.tasks.pdf_tasks import generate_and_send_ticket
                        generate_and_send_ticket.delay(str(order.id))
                    except Exception as spawn_err:
                        print(f"[Reconciler Beat] Fail enqueuing pdf generation: {spawn_err}")
                elif result_code_int in (1032, 1037, 2001):
                    # User cancelled or expired STK prompt
                    order.status = OrderStatus.FAILED
                    await db.commit()
                    
                    # Restore inventory reservation count
                    stmt_restore = (
                        update(TicketCategory)
                        .where(TicketCategory.id == order.category_id)
                        .values(remaining_quantity=TicketCategory.remaining_quantity + order.quantity)
                    )
                    await db.execute(stmt_restore)
                    await db.commit()
        except Exception as e:
            print(f"[Reconciler Beat Error] Failed reconciling orders: {e}")
        finally:
            await redis_client.aclose()

async def run_update_event_statuses():
    """Asynchronous runner to tag expired music events as past"""
    from app.database import AsyncSessionLocal
    from app.models.event import Event, EventStatus
    
    async with AsyncSessionLocal() as db:
        try:
            now = datetime.utcnow()
            stmt = select(Event).where(
                Event.status == EventStatus.ACTIVE,
                Event.event_date < now
            )
            res = await db.execute(stmt)
            stale_events = res.scalars().all()
            
            for evt in stale_events:
                evt.status = EventStatus.PAST
                print(f"[Event Monitor Beat] Classifying Event {evt.id} - '{evt.name}' as past.")
                
            await db.commit()
        except Exception as e:
            print(f"[Event Monitor Beat Error] Failed updating event states: {e}")


# --- CELERY TASK ENDPOINTS ---

@app.task(name="workers.tasks.sweeper_tasks.release_expired_reservations")
def release_expired_reservations():
    """Schedules cron sweeper to run every minute in background process loop"""
    asyncio.run(run_release_expired_reservations())

@app.task(name="workers.tasks.sweeper_tasks.reconcile_pending_orders")
def reconcile_pending_orders():
    """Check Safaricom endpoints for stalled payments status reconciliation"""
    asyncio.run(run_reconcile_pending_orders())

@app.task(name="workers.tasks.sweeper_tasks.update_event_statuses")
def update_event_statuses():
    """Automatic categorization updates for concerts passing active schedule slots"""
    asyncio.run(run_update_event_statuses())
