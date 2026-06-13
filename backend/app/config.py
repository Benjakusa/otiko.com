import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://app_user:secure_password_132@localhost:5432/otiko_db"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "otiko-shared-signing-secret-2026"
    FIREBASE_CREDENTIALS: str = '{"type": "service_account", "project_id": "otiko-sandbox"}'
    
    # Allow settings override using environment variables
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="allow"
    )

settings = Settings()
