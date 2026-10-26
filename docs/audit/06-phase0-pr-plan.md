OTIKO FLASH-SALE AUDIT - PHASE 0 PR PLAN
========================================

Interim buy flow (critical). Removing the simulator breaks purchasing because public-buy-flow.tsx
calls /api/mpesa/initiate/:orderId (line 177). Handle it like this:

Step 1 (PR 0.1): add server-side flag PAYMENTS_ENABLED (default false in production). When false,
/api/orders/reserve and the payment endpoints return 503 with a friendly "sales temporarily paused"
payload, and the buy flow shows a maintenance state. Delete the simulator route and triggerSimulatedCallback
money path outright.

Step 2 (after PRs 0.3, 0.6, 0.7 are merged and tested): repoint the frontend buy flow to the FastAPI
reserve/initiate endpoints with real Daraja (sandbox first, then production), behind the flag. Do not
re-enable sales on a path that has not passed the abuse regression suite (PR 0.12).

Organizer features (events, dashboard, scanner) keep working on Node during Phase 0; only money and
inventory endpoints are disabled or moved.

PR | Title | Closes | Main files | Required tests | Rollback | Effort | Depends on
---|-------|--------|------------|----------------|----------|--------|------------
0.1 | Kill-switch PAYMENTS_ENABLED; delete Node STK simulator + simulated callback | C1, C7 (partial) | server.ts, public-buy-flow.tsx | unauthenticated initiate returns 503/404; no route can set order paid without verified confirmation | revert PR; flag stays false | S | n/a
0.2 | Node auth: remove UID-as-bearer and getOrganizerByTokenSync; require verified ID token; refuse to start in production if firebaseAuth is null | C4 | server.ts | raw-UID bearer -> 401; startup fails without service account in prod | revert | M | n/a
0.3 | FastAPI auth: delete mock/user-default-uid paths and the no-token fallback; stop auto-creating organizers with hardcoded payout number; check_revoked=True | C3 | backend/app/dependencies.py | no token -> 401; mock tokens -> 401; no side-effect organizer rows | revert | S | n/a
0.4 | Client: remove user-default-uid fallbacks, redirect to login when unauthenticated | C3, C4 | src/App.tsx, src/lib/firebase/auth.ts, src/pages/UserDashboard.tsx | UI test: no token -> login; no request carries a default token | revert | S | 0.3
0.5 | Capability tokens for buyer order/ticket access; gate /api/tickets/verify; remove the no-org scan path; strip PII from public responses | C4, M2 | server.ts, buy flow | enumeration test of order IDs yields 401/404; verify requires authenticated owner; responses contain no foreign PII | revert | M | 0.2
0.6 | M-Pesa fail-closed; fix reconciler (ResultCode == 0 from the Query only); remove fake-success and invented-checkout paths | C2 | mpesa_service.py, sweeper_tasks.py | missing creds -> error, order stays pending; network error -> error; reconciler with ResponseCode "0" and ResultCode 1032 -> not paid | revert | S | n/a
0.7 | Callback minimum hardening: SELECT ... FOR UPDATE on order, amount == total, persist receipt (unique), never mark paid after expiry unless inventory re-acquired atomically, remove organizer_id = event_id fallback | C6 (partial) | routers/mpesa.py, models + Alembic migration | duplicate, concurrent, wrong-amount, late-after-expiry and forged-token tests | revert + migration downgrade | M | 0.6
0.8 | Public surface: auth on /release-expired (or remove); /docs and /redoc off in prod; CORS allowlist; security headers on both servers; rate limits on BOTH servers; atomic Redis limiter + shared pool | C9, H3 (partial) | backend/app/main.py, routers/orders.py, rate_limiter.py, dependencies.py, server.ts | header tests; CORS preflight from foreign origin rejected; limiter race test (N parallel calls never exceed max) | revert | M | n/a
0.9 | Uploads/KYC: remove public static mount for KYC; private storage; magic-byte validation; authorized short-lived access only | C10 | server.ts | unauthenticated KYC URL -> 401/404; non-PDF with PDF MIME rejected | revert | M | 0.2
0.10 | Secrets hygiene: strip secrets from docker-compose.yml (use env refs), .env.example only, gitleaks in CI + pre-commit, rotation runbook | C5 | docker-compose.yml, CI | gitleaks finds nothing on HEAD | revert | S | n/a
0.11 | CI repair: correct paths (frontend-public/frontend-admin do not exist), blocking tests, pinned image tags, supported base image, remove latest | H7 (partial) | .github/workflows/deploy.yml, Dockerfiles | pipeline green on a clean branch | revert | S | n/a
0.12 | Abuse regression suite: automated authz matrix (anonymous / wrong organizer / organizer / admin) over every route; free-ticket attempts; enumeration; forged callbacks; replay | all Phase 0 | tests/security/ | suite is required in CI | n/a | M | 0.1-0.9

Phase 0 gate (all must hold): abuse regression suite green in CI; no route can create a paid order or ticket without verified Daraja confirmation; no mock/default/UID token is accepted anywhere; no public PII or KYC exposure; secrets rotated (human action recorded); forensics queries delivered. Stop at the gate and report; do not start Phase 1 until the owner signs off.