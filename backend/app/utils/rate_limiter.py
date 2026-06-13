import redis.asyncio as aioredis

class RateLimiter:
    def __init__(self, redis_client: aioredis.Redis):
        self.redis = redis_client

    async def check_limit(
        self, 
        key: str, 
        max_requests: int = 1, 
        window_seconds: int = 10
    ) -> bool:
        """
        Keyspace rate limiter using simple Redis increment counter.
        Returns True if request is allowed, False otherwise.
        """
        redis_key = f"rate_limit:{key}"
        current = await self.redis.get(redis_key)
        
        if current is not None and int(current) >= max_requests:
            return False
            
        async with self.redis.pipeline(transaction=True) as pipe:
            pipe.incr(redis_key)
            # Only set expiry on initial request
            if current is None:
                pipe.expire(redis_key, window_seconds)
            await pipe.execute()
            
        return True
