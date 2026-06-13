import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
import redis.asyncio as aioredis

from app.main import app
from app.database import Base, get_db
from app.dependencies import get_redis

# Using in-memory/test SQLite asynchronous driver or isolated postgres test system
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="session")
def event_loop():
    """Generates a separate asyncio event loop for isolated concurrent thread testing"""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture(scope="session")
async def test_engine():
    """Isolated SQL session engine"""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        # SQLite dialect specific setup if needed or native postgres tables
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()

@pytest_asyncio.fixture
async def db_session(test_engine) -> AsyncSession:
    """Isolated session transaction tracking rolled back automatically after every unit test"""
    async_session = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with async_session() as session:
        yield session
        await session.rollback()

@pytest_asyncio.fixture
async def mock_redis():
    """Minimal local mock engine simulating aioredis commands for unit test pipeline runner speed"""
    class MockRedis:
        def __init__(self):
            self.data = {}
            
        async def get(self, key):
            return self.data.get(key)
            
        async def setex(self, key, expiry, value):
            self.data[key] = value
            return True
            
        async def delete(self, key):
            if key in self.data:
                del self.data[key]
            return True
            
        async def pipeline(self, transaction=True):
            return self
            
        async def incr(self, key):
            self.data[key] = str(int(self.data.get(key, 0)) + 1)
            return int(self.data[key])
            
        async def expire(self, key, seconds):
            return True
            
        async def execute(self):
            return []
            
        async def __aenter__(self):
            return self
            
        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass
            
        async def aclose(self):
            pass
            
    return MockRedis()

@pytest_asyncio.fixture
async def client(db_session, mock_redis) -> AsyncClient:
    """ASGI standard mock test client mapping request-response routes"""
    def override_get_db():
        yield db_session

    def override_get_redis():
        yield mock_redis

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_redis] = override_get_redis
    
    async with AsyncClient(
        transport=ASGITransport(app=app), 
        base_url="http://testserver"
    ) as ac:
        yield ac
        
    app.dependency_overrides.clear()
