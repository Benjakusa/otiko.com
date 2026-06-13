import redis.asyncio as aioredis
from ..config import settings

async def create_redis_client() -> aioredis.Redis:
    """Explicitly initializes standalone Redis connection pool"""
    return aioredis.from_url(settings.REDIS_URL, decode_responses=True)
