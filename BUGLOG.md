# Bug Hunt Log

## Batches

### 1. Payment/money logic
- [x] `backend/app/routers/mpesa.py`
- [x] `backend/app/routers/orders.py`
- [x] `backend/app/services/mpesa_service.py`
- [x] `server.ts` (M-Pesa, Orders, and Payout routes)

### 2. Reservation/ticketing core logic
- [ ] `backend/app/routers/tickets.py`
- [ ] `backend/app/services/reservation_service.py`
- [ ] `redis.ts` (Reservation logic & locks)
- [ ] `server.ts` (Ticket issuing and reservation endpoints)

### 3. Auth-adjacent logic
- [ ] `backend/app/routers/auth.py`
- [ ] `backend/app/routers/organizers.py`
- [ ] `backend/app/services/firebase_service.py`
- [ ] `server.ts` (Auth, session, and organizer endpoints)
- [ ] `src/components/auth/`
- [ ] `src/lib/firebase/`

### 4. Remaining backend routes/services
- [ ] `backend/app/routers/events.py`
- [ ] `backend/app/services/event_service.py`
- [ ] `server.ts` (Init, middleware, events CRUD)
- [ ] `backend/app/main.py`, `backend/app/database.py`, `backend/app/dependencies.py`, `backend/app/config.py`

### 5. Database models/schemas
- [ ] `backend/app/models/`
- [ ] `backend/app/schemas/`
- [ ] `src/types/`
- [ ] `src/types.ts`

### 6. Frontend components and state management
- [ ] `src/pages/`
- [ ] `src/components/` (excluding auth)
- [ ] `src/App.tsx`
- [ ] `src/main.tsx`

### 7. Shared utilities/helpers
- [ ] `src/lib/` (excluding firebase)
- [ ] `backend/app/utils/`
- [ ] `backend/app/exceptions/`
- [ ] `backend/app/middleware/`

### 8. Mobile app source
- [ ] (No mobile app source found in repository)

### 9. Scripts, config, tooling
- [ ] `scripts/`
- [ ] `workers/`
- [ ] `tests/`
- [ ] `infra/`
- [ ] Root config (`vite.config.ts`, `docker-compose.yml`, `alembic.ini`, `package.json`, `tsconfig.json`, `Dockerfile`, etc.)

## Findings

| Batch | File:Line | Severity | Description | Status (Fixed/Flagged) | Commit |
|-------|-----------|----------|-------------|------------------------|--------|
| 1 | `server.ts:797` | CRITICAL | Race condition: Order expiry `setTimeout` yields on `await`. A concurrent M-Pesa callback can acquire lock and mark paid, causing double-booking. [Test proved 20/20 oversell before fix, 0/20 after re-checking status post-yield] | Fixed | 4bac835 |
| 1 | `backend/app/routers/mpesa.py:196` | HIGH | Failed M-Pesa callback releases inventory in DB but fails to release Redis reservation lock, causing tickets to falsely appear sold out until the background sweeper reconciles them. | Flagged | - |
| 1 | `backend/app/routers/mpesa.py:163` | HIGH | `organizer_id` incorrectly falls back to `order.event_id` if event is not found, assigning ledger revenue to an invalid organizer UUID. | Flagged | - |
| 1 | `server.ts:900` | HIGH | Floating point math used for money (`Math.round(gross * 0.05 * 100) / 100`). Can cause off-by-cent rounding errors in Ledger amounts. | Flagged | - |
| 1 | `backend/app/routers/orders.py:62` | MEDIUM | Timezone-naive date comparison (`event.event_date < datetime.utcnow()`). | Flagged | - |
| 1 | `server.ts:751` | MEDIUM | Timezone-naive date comparison (`new Date(evt.eventDate).getTime() < Date.now()`). | Flagged | - |
| 1 | `backend/app/routers/mpesa.py:166` | LOW | `platform_fee = order.total_amount * Decimal("0.05")` can result in fractional cents stored in DB if amount isn't perfectly divisible by 20. | Flagged | - |
