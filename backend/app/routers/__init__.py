from fastapi import APIRouter
from .auth import router as auth_router
from .organizers import router as organizers_router
from .events import router as events_router
from .orders import router as orders_router
from .mpesa import router as mpesa_router
from .tickets import router as tickets_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(organizers_router, prefix="/organizers", tags=["Organizers"])
api_router.include_router(events_router, prefix="/events", tags=["Events"])
api_router.include_router(orders_router, prefix="/orders", tags=["Orders"])
api_router.include_router(mpesa_router, prefix="/mpesa", tags=["M-Pesa"])
api_router.include_router(tickets_router, prefix="/tickets", tags=["Tickets"])
