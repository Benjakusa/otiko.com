# Rollback Procedure

## Database Rollback

### Fast Migration (one revision)
```bash
alembic downgrade -1
```

### Full rollback (all the way to empty)
```bash
alembic downgrade base
```

### Verify current revision
```bash
alembic current
```

### Migration history
```bash
alembic history
```

### Important
- Always test `downgrade` locally before running in production.
- Downgrades can be **destructive** (drop columns/tables). Ensure backups exist before rolling back.
- After a downgrade, the **old Docker image** must be deployed (see below) — code and schema must match.

---

## Application Rollback (Cloud Run)

### Option 1: Redeploy previous image (fastest)
Images are tagged by commit SHA. Find the previous image and redeploy:

```bash
# List recent revisions to find the previous image tag
gcloud run revisions list --service=otiko-backend

# Deploy using the previous image
gcloud run deploy otiko-backend \
  --image=gcr.io/otiko-9e7a9/otiko-backend:<PREVIOUS_COMMIT_SHA> \
  --region=us-central1

# If the rollback includes a DB schema downgrade, run it first:
# (SSH into a temporary pod or run via Cloud Run job)
# alembic downgrade -1
```

### Option 2: Traffic split (gradual rollback)
```bash
gcloud run services update-traffic otiko-backend \
  --to-revisions=otiko-backend-<PREVIOUS_REV>=100
```

---

## Database Backups

### Automatic backup config
Backups are managed via Cloud SQL's automated backup policy.
- Schedule: Daily at 02:00 UTC
- Retention: 7 days

### Manual backup
```bash
gcloud sql backups create --instance=otiko-db --async
```

### Restore from backup
```bash
# List available backups
gcloud sql backups list --instance=otiko-db

# Restore a specific backup
gcloud sql backups restore <BACKUP_ID> --restore-instance=otiko-db
```

### Point-in-time recovery
```bash
gcloud sql instances clone otiko-db otiko-db-recovery \
  --point-in-time='2026-06-20T14:00:00Z'
```

---

## Rollback Checklist

1. Stop all deployments/traffic to the affected service
2. Check `alembic current` to see the current DB revision
3. If reverting schema: run `alembic downgrade -1` (one step)
4. Deploy the previous application image
5. Verify `/health` returns `200 OK`
6. Run a smoke test (create event, reserve ticket, verify ticket)
7. Monitor logs for errors in the first 5 minutes
