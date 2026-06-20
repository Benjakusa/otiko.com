from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from .database import engine, Base
from .routers import api_router
from .middleware.rate_limit import limiter

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager — schema migrations are handled by Alembic
    at deploy time. This only ensures the connection pool is clean.
    """
    yield
    await engine.dispose()

app = FastAPI(
    title="Otiko High-Throughput African Concert Ticketing API",
    description="Engineered to withstand flash-sale demand spikes utilizing row-level database locks.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Enable CORS for frontend asset client domain integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://otiko.com",
        "https://www.otiko.com",
        "https://otiko-9e7a9.web.app",
        "https://otiko-9e7a9.firebaseapp.com",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect centralized API prefix
app.include_router(api_router, prefix="/api")

@app.get("/health")
async def health_check():
    """Health status monitor"""
    return {
        "status": "healthy",
        "service": "otiko-backend",
        "latency_modes": "active"
    }
