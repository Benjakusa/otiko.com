import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta

@pytest.mark.asyncio
async def test_create_and_fetch_events_workflow(client: AsyncClient, db_session):
    """Verifies complete event posting, category binding, and querying"""
    event_payload = {
        "name": "Nairobi SolFest Experience",
        "flyer_url": "https://otiko.com/flyer.jpg",
        "event_date": (datetime.utcnow() + timedelta(days=5)).isoformat() + "Z",
        "venue": "Ngong Racecourse, Nairobi",
        "description": "Celebrating classic Sauti Sol rhythms on track",
        "categories": [
            {"name": "Regular Pass", "price": 1500.0, "total_quantity": 250},
            {"name": "VIP Lounge", "price": 5000.0, "total_quantity": 50}
        ]
    }
    
    # 1. Create Event with authenticated header fallback
    create_res = await client.post("/api/events", json=event_payload)
    assert create_res.status_code == 201, create_res.text
    created_data = create_res.json()
    assert created_data["name"] == "Nairobi SolFest Experience"
    assert "event_code" in created_data
    assert len(created_data["categories"]) == 2
    
    # 2. Query Public events list
    list_res = await client.get("/api/events")
    assert list_res.status_code == 200
    events_list = list_res.json()
    assert len(events_list) >= 1
    
    # 3. Query individual detailed event by code
    code = created_data["event_code"]
    detailed_res = await client.get(f"/api/events/{code}")
    assert detailed_res.status_code == 200
    assert detailed_res.json()["name"] == "Nairobi SolFest Experience"
