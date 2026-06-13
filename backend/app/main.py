from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .database import engine, Base
from .routers import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager that ensures our database tables 
    and constraints are bootstrapped in mock/local iterations safely
    """
    try:
        async with engine.begin() as conn:
            # Automatic schema synchronization for local developer comfort
            await conn.run_sync(Base.metadata.create_all)
    except Exception as exc:
        print(f"[Lifespan] Schema bootstrap notice / skip: {exc}")
    yield
    # Shutdown connection pool
    await engine.dispose()

app = FastAPI(
    title="Otiko High-Throughput African Concert Ticketing API",
    description="Engineered to withstand flash-sale demand spikes utilizing row-level database locks.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for frontend asset client domain integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
