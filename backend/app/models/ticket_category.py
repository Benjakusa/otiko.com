from sqlalchemy import String, Integer, Numeric, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from decimal import Decimal
import uuid
from ..database import Base

class TicketCategory(Base):
    __tablename__ = "ticket_categories"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    total_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    remaining_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # CHECK constraint: remaining_quantity >= 0 to enforce atomic DB protection
    __table_args__ = (
        CheckConstraint("remaining_quantity >= 0", name="check_remaining_positive"),
    )
