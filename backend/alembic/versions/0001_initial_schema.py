"""Initial schema: create all tables

Revision ID: 0001_initial_schema
Revises: None
Create Date: 2026-06-20

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ENUM types
    kycstatus = postgresql.ENUM("pending", "verified", "rejected", name="kycstatus")
    kycstatus.create(op.get_bind())
    eventstatus = postgresql.ENUM("draft", "active", "past", "cancelled", name="eventstatus")
    eventstatus.create(op.get_bind())
    orderstatus = postgresql.ENUM("pending", "paid", "failed", "expired", name="orderstatus")
    orderstatus.create(op.get_bind())
    ticketstatus = postgresql.ENUM("valid", "used", "cancelled", name="ticketstatus")
    ticketstatus.create(op.get_bind())
    entrytype = postgresql.ENUM("sale", "payout", "adjustment", name="entrytype")
    entrytype.create(op.get_bind())

    # organizers
    op.create_table(
        "organizers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("firebase_uid", sa.String(128), unique=True, nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("business_name", sa.String(255), nullable=True),
        sa.Column("kyc_status", kycstatus, nullable=False, server_default="pending"),
        sa.Column("mpesa_payout_number", sa.String(20), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.text("now()")),
    )

    # events
    op.create_table(
        "events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("event_code", sa.String(50), unique=True, nullable=False, index=True),
        sa.Column("organizer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizers.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("flyer_url", sa.String(512), nullable=True),
        sa.Column("event_date", sa.DateTime, nullable=False, index=True),
        sa.Column("venue", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("status", eventstatus, nullable=False, server_default="draft", index=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_events_status_date", "events", ["status", "event_date"])

    # ticket_categories
    op.create_table(
        "ticket_categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("price", sa.Numeric(12, 2), nullable=False),
        sa.Column("total_quantity", sa.Integer, nullable=False),
        sa.Column("remaining_quantity", sa.Integer, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("remaining_quantity >= 0", name="check_remaining_positive"),
    )

    # orders
    op.create_table(
        "orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("events.id"), nullable=False, index=True),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ticket_categories.id"), nullable=False, index=True),
        sa.Column("buyer_name", sa.String(255), nullable=False),
        sa.Column("buyer_phone", sa.String(20), nullable=False),
        sa.Column("buyer_email", sa.String(255), nullable=False),
        sa.Column("quantity", sa.Integer, nullable=False),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", orderstatus, nullable=False, server_default="pending", index=True),
        sa.Column("mpesa_checkout_request_id", sa.String(100), unique=True, nullable=True, index=True),
        sa.Column("reserved_at", sa.DateTime, nullable=False, server_default=sa.text("now()")),
        sa.Column("expires_at", sa.DateTime, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_orders_expiry", "orders", ["status", "expires_at"])

    # tickets
    op.create_table(
        "tickets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("orders.id"), nullable=False, index=True),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("events.id"), nullable=False, index=True),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ticket_categories.id"), nullable=False, index=True),
        sa.Column("ticket_number", sa.Integer, nullable=False),
        sa.Column("qr_signature", sa.String(255), nullable=False),
        sa.Column("pdf_url", sa.String(512), nullable=True),
        sa.Column("status", ticketstatus, nullable=False, server_default="valid"),
        sa.Column("issued_at", sa.DateTime, nullable=False, server_default=sa.text("now()")),
        sa.Column("used_at", sa.DateTime, nullable=True),
        sa.UniqueConstraint("event_id", "ticket_number", name="uq_event_ticket_number"),
    )
    op.create_index("idx_tickets_event_status", "tickets", ["event_id", "status"])

    # ledger_entries
    op.create_table(
        "ledger_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organizer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizers.id"), nullable=False, index=True),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("orders.id"), nullable=True, index=True),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("events.id"), nullable=False, index=True),
        sa.Column("gross_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("platform_fee", sa.Numeric(12, 2), nullable=False),
        sa.Column("net_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("entry_type", entrytype, nullable=False, server_default="sale"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("now()")),
    )

    # payouts
    op.create_table(
        "payouts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organizer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizers.id"), nullable=False, index=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("phone_number", sa.String(20), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("reference_id", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("now()")),
    )

    # email_logs
    op.create_table(
        "email_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("ticket_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="sent"),
        sa.Column("error", sa.Text, nullable=True),
        sa.Column("retry_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("sent_at", sa.DateTime, nullable=False, server_default=sa.text("now()")),
    )


def downgrade() -> None:
    op.drop_table("email_logs")
    op.drop_table("payouts")
    op.drop_table("ledger_entries")
    op.drop_table("tickets")
    op.drop_table("orders")
    op.drop_table("ticket_categories")
    op.drop_table("events")
    op.drop_table("organizers")

    postgresql.ENUM(name="entrytype").drop(op.get_bind(), if_exists=True)
    postgresql.ENUM(name="ticketstatus").drop(op.get_bind(), if_exists=True)
    postgresql.ENUM(name="orderstatus").drop(op.get_bind(), if_exists=True)
    postgresql.ENUM(name="eventstatus").drop(op.get_bind(), if_exists=True)
    postgresql.ENUM(name="kycstatus").drop(op.get_bind(), if_exists=True)
