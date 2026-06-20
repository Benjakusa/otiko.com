from sqlalchemy import String, Numeric, DateTime, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from decimal import Decimal
import enum
import uuid
from ..database import Base

class EntryType(str, enum.Enum):
    SALE = "sale"
    PAYOUT = "payout"
    ADJUSTMENT = "adjustment"

class LedgerEntry(Base):
    __tablename__ = "ledger_entries"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    organizer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizers.id"), index=True)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id"), nullable=True, index=True)
    event_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("events.id"), index=True)
    gross_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    platform_fee: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    net_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    entry_type: Mapped[EntryType] = mapped_column(Enum(EntryType), default=EntryType.SALE)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Payout(Base):
    __tablename__ = "payouts"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    organizer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizers.id"), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    phone_number: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, completed, failed
    reference_id: Mapped[str] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
