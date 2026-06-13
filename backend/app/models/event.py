from sqlalchemy import String, Enum, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
import enum
import uuid
from ..database import Base

class EventStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAST = "past"
    CANCELLED = "cancelled"

class Event(Base):
    __tablename__ = "events"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    event_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    organizer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizers.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    flyer_url: Mapped[str] = mapped_column(String(512), nullable=True)
    event_date: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    venue: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[EventStatus] = mapped_column(Enum(EventStatus), default=EventStatus.DRAFT, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Composite index for homepage performance query sorting
    __table_args__ = (
        Index("idx_events_status_date", "status", "event_date"),
    )
