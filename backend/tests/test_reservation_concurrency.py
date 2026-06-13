import asyncio
import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta
from app.models.ticket_category import TicketCategory

@pytest.mark.asyncio
async def test_concurrent_reservations_no_oversell(client: AsyncClient, db_session):
    """
    Submits multiple concurrent requests for limited spots.
    Verifies that total bookings NEVER exceed designated category availability.
    """
    # 1. Setup Event with strictly limited ticket slots (e.g. exactly 5 passes remaining)
    event_payload = {
        "name": "Sauti Sol Intimate Exclusive",
        "event_date": (datetime.utcnow() + timedelta(days=10)).isoformat() + "Z",
        "venue": "The Alchemist Bar",
        "categories": [
            {"name": "Ultra-VVIP Table", "price": 12000, "total_quantity": 5}
        ]
    }
    create_res = await client.post("/api/events", json=event_payload)
    assert create_res.status_code == 201
    category_id = create_res.json()["categories"][0]["id"]
    
    # helper to attempt booking
    async def try_exclusive_booking(index: int):
        # vary phone numbers to bypass rate limit checks
        payload = {
            "category_id": category_id,
            "quantity": 1,
            "buyer_name": f"VIP Guest {index}",
            "buyer_phone": f"2547000000{index:02d}",
            "buyer_email": f"guest{index}@exclusive.com"
        }
        res = await client.post("/api/orders/reserve", json=payload)
        return res.status_code
        
    # Attempt 10 concurrent ticket queries (only 5 seats exist)
    tasks = [try_exclusive_booking(i) for i in range(10)]
    results = await asyncio.gather(*tasks)
    
    successes = sum(1 for status in results if status == 200)
    conflicts = sum(1 for status in results if status == 409)
    
    # EXACTLY 5 bookings must succeed, and remainder must be gracefully rejected with a 409 conflict
    assert successes == 5, f"Successes: {successes}, Expected: 5"
    assert conflicts == 5, f"Conflicts: {conflicts}, Expected: 5"
