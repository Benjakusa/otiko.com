# Slowapi integration configuration for FastAPI Rate Limiting
import os
from fastapi import Request
try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
except ImportError:
    Limiter = None
    get_remote_address = lambda request: "127.0.0.1"

# Initialize Limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
