import os
import sys
from celery import Celery

# Ensure Python directories search paths are registered correctly
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.append("/backend")
sys.path.append("/app")

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
app = Celery("otiko", broker=REDIS_URL, backend=REDIS_URL)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# Automated Chronological Celery Beat task scheduler configuration
app.conf.beat_schedule = {
    "release-expired-reservations-beat": {
        "task": "workers.tasks.sweeper_tasks.release_expired_reservations",
        "schedule": 60.0,  # Every 1 minute
    },
    "reconcile-pending-orders-beat": {
        "task": "workers.tasks.sweeper_tasks.reconcile_pending_orders",
        "schedule": 600.0,  # Every 10 minutes
    },
    "update-event-statuses-beat": {
        "task": "workers.tasks.sweeper_tasks.update_event_statuses",
        "schedule": 900.0,  # Every 15 minutes
    },
}

# Explicitly register modules to load
app.autodiscover_tasks([
    "workers.tasks.pdf_tasks",
    "workers.tasks.email_tasks",
    "workers.tasks.sweeper_tasks"
])
