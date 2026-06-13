from sqlalchemy import String, Integer, DateTime, ForeignKey, Enum, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
import enum
import uuid
from ..database import Base

class TicketStatus(str, enum.Enum):
    VALID = "valid"
    USED = "used"
    CANCELLED = "cancelled"

class Ticket(Base):
    __tablename__ = "tickets"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id"), index=True)
    event_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("events.id"), index=True)
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("ticket_categories.id"))
    ticket_number: Mapped[int] = mapped_column(Integer, nullable=False)  # Sequential per event
    qr_signature: Mapped[str] = mapped_column(String(255), nullable=False)
    pdf_url: Mapped[str] = mapped_column(String(512), nullable=True)
    status: Mapped[TicketStatus] = mapped_column(Enum(TicketStatus), default=TicketStatus.VALID)
    issued_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    used_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint("event_id", "ticket_number", name="uq_event_ticket_number"),
        Index("idx_tickets_event_status", "event_id", "status"),
    )
