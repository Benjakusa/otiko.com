import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Set Python search paths to include /backend and /
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
sys.path.append("/backend")
sys.path.append("/app")

# Sync PostgreSQL or local SQLite driver URL parsing
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://app_user:secure_password_132@localhost:5432/otiko_db")
if DATABASE_URL.startswith("postgresql+asyncpg"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg", "postgresql")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
