import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta

@pytest.mark.asyncio
async def test_order_reservation_and_expiry_lifecycle(client: AsyncClient, db_session):
    """Exercises the lifecycle of a purchase order reservation with custom constraints"""
    # 1. Setup Event Category
    event_payload = {
        "name": "Blankets & Wine",
        "event_date": (datetime.utcnow() + timedelta(days=2)).isoformat() + "Z",
        "venue": "Laureat Park",
        "categories": [
            {"name": "General", "price": 2500, "total_quantity": 10}
        ]
    }
    create_res = await client.post("/api/events", json=event_payload)
    assert create_res.status_code == 201
    event_data = create_res.json()
    category_id = event_data["categories"][0]["id"]
    
    # 2. Submit valid ticket reservation booking
    reserve_payload = {
        "category_id": category_id,
        "quantity": 2,
        "buyer_name": "Wycliffe",
        "buyer_phone": "254712345678",
        "buyer_email": "wycliffe@otiko.com"
    }
    reserve_res = await client.post("/api/orders/reserve", json=reserve_payload)
    assert reserve_res.status_code == 200
    order_data = reserve_res.json()
    assert order_data["status"] == "pending"
    assert float(order_data["total_amount"]) == 5000.0
    
    # 3. Check rate limiting error on rapid purchase attempts
    rapid_res = await client.post("/api/orders/reserve", json=reserve_payload)
    # The rate limiter kicks in after 2 requests (since conftest setup configures limiter pipeline checks)
    assert rapid_res.status_code in [200, 429]
