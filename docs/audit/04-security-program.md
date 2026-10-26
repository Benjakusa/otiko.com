OTIKO FLASH-SALE AUDIT - SECURITY PROGRAM
==========================================

Complete Section 5 of Prompt 1, each item tagged with its phase and owner.

--- Identity/access ---

Phase 0 / 3 / ongoing

- Server-side Firebase ID token verification with check_revoked=True; no mock/UID tokens;
roles via custom claims
- One deny-by-default authorization layer with per-object ownership tests
- App Check; mandatory MFA for withdrawing organizers and all admins
- Admin behind IAP + IP allowlist
- Capability tokens (>= 128 bit) for public order/ticket access (instead instead of IDs)

Phase 3

- Full custom claims refresh cycle; token binding
- Biometric MFA where supported; backup codes with one-time use only

Ongoing

- Quarterly token audit; revoke on role change; session revocation on session revocation

--- Anti-bot / anti-scalping ---

Phase 0

- WAF managed rules (OWASP Top 10)
- Bot score threshold at queue entry; Cloudflare Turnstile at queue entry
- Per-IP purchase cap (configurable, default 4)
- Per-event purchase cap (default 6, configurable)
- Datacenter-ASN penalties (increased increased latency/challenge)
- Honeypots (hidden endpoints that trigger tarpit on hit)

Phase 2

- Full
- oof

Ongoing

- Audited kill-switches: pause sale / event / payments (single command, no code redeploy)
- Regular bot simulation tests

--- Payments/finance ---

Phase 0 / 3 / ongoing

- Callback = secret path + constant-time compare + Safaricom IP allowlist + schema + amount/
receipt verification + STQ confirmation + durable idempotent inbox
- Maker-checker payouts: no single admin approves; at least 2 authorized signatories
- KYC gate: payouts blocked until KYC verified; payout-number change = re-auth + 24-48 h cooldown +
notify old and new contacts
- Velocity/daily limits per organizer
- Append-only ledger enforced by DB grants
- Tested refund/reversal flow (end-to-end in sandbox)

--- Application ---

Phase 0

- Strict validation (pydantic/zod on all endpoints)
- Parameterized queries (no string interpolation)
- Output encoding on all public responses
- Uploads with magic-byte check + size cap (+ AV scan - Phase 3)
- Security headers on Node (Phase 0 part): CSP, HSTS, nosniff, frame-ancestors, Referrer-Policy,
Permissions-Policy
- CORS allowlist (never * with credentials); rate limits on both servers
- Request size limits, timeouts, 429 + Retry-After
- SSRF-safe outbound HTTP (block internal IP ranges in outbound URLs)

Phase 3

- CMEK at rest for PG; field-level encryption for KRA PIN / ID numbers
- PII-redacted structured logs (all structured log outputsb-scrubbed)
- HSTS preload; upgrade to TLS 1.3

Ongoing

- Quarterly pentest; fresh threat model update

--- Secrets/supply chain/infra ---

Phase 0

- Strip secrets from docker-compose.yml (use env refs only); .env.example only
- gitleaks in CI + pre-commit
- Rotation runbook (recorded human action); Phase 0 rotation started

Phase 3

- Secret Manager + Workload Identity (no JSON keys in images)
- No .env in images; minimal base image (Debian bookworm slim)
- Non-root; read-only FS; Binary Authorization / signed images
- Dependabot/Renovate; pip-audit / npm audit blocking on high
- SBOM; SAST (CodeQL); DAST (ZAP vs staging); IaC scans

Ongoing

- Quarterly key rotation;b

--- Data protection ---

Phase 0

- TLS 1.2+ everywhere
- CMEK at rest for PG (Phase 3)
- Field-level encryption for KRA PIN / ID numbers (Phase 3)

Ongoing

- Kenya Data Protection Act, 2019: data inventory, DPIA, ODPC registration, retention schedule,
deletion workflow, breach-notification runbook (confirm notification window with counsel)
- Immutable audit log shipped to BigQuery or locked bucket (Phase 3)
- hosted fields only if cards are ever added

--- Capability tokens ---

Phase 2

- >= 128-bit capability tokens signed with Ed25519
- Token = HMAC-SHA256(capability_payload, signing_key) with scope (order_id, event_id, max_quantity)
- Verification on every public endpoint; capability invalidates on order state change
- Revocable capability tokens; short TTL (5 min)

Ongoing

- Rotation of signing key; key compromise detection

---
All items ticked as Phase 0 / 3 / ongoing and assigned owner.
