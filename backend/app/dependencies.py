from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json
import os
import firebase_admin
from firebase_admin import auth, credentials
import redis.asyncio as aioredis

from .database import get_db
from .config import settings
from .models.organizer import Organizer

# Initializing Firebase connection safely
try:
    if not firebase_admin._apps:
        cred_dict = json.loads(settings.FIREBASE_CREDENTIALS)
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
except Exception as e:
    print(f"[Warning] Firebase initialization skipped: {e}")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

async def get_redis():
    """Shared Redis connection client pooling"""
    client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        yield client
    finally:
        await client.aclose()

async def get_current_organizer(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Organizer:
    """Authenticates the incoming auth token against Firebase and retrieves or creates the local organizer"""
    import os
    
    if not token:
        if os.environ.get("ALLOW_DEMO_AUTH") == "true":
            token = "mock-organizer-uid"
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing authorization token"
            )
        
    try:
        # Check if doing mock/local bypass for preview demo
        if os.environ.get("ALLOW_DEMO_AUTH") == "true" and (token == "mock-organizer-uid" or token == "user-default-uid"):
            firebase_uid = "org_123_default"
            email = "demo@otiko.com"
            name = "Demo Organizer"
        else:
            decoded_token = auth.verify_id_token(token)
            firebase_uid = decoded_token["uid"]
            email = decoded_token.get("email", "")
            name = decoded_token.get("name", "New Organizer")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired credentials token"
        )
    
    # Query database for matching firebase_uid
    stmt = select(Organizer).where(Organizer.firebase_uid == firebase_uid)
    result = await db.execute(stmt)
    organizer = result.scalar_one_or_none()
    
    if not organizer:
        # Auto-create profile on first API login
        organizer = Organizer(
            firebase_uid=firebase_uid,
            email=email,
            name=name,
            business_name=f"{name} Ventures",
            mpesa_payout_number="254712345678"
        )
        db.add(organizer)
        await db.commit()
        await db.refresh(organizer)
        
    return organizer
