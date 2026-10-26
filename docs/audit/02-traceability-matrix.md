OTIKO FLASH-SALE AUDIT - TRACEABILITY MATRIX
=============================================

Every finding mapped to a phase and PR. No finding left blank.

Finding | Phase 0 (PR) | Later phase
--- | --- | ---
C1 | 0.1 | n/a
C2 | 0.6 | P1: reconciler rewrite with state machine
C3 | 0.3, 0.4 | P3: MFA, App Check
C4 | 0.2, 0.5 | P2: capability tokens end-to-end, Ed25519
C5 | 0.10 | P3: Secret Manager + Workload Identity
C6 | 0.7 (partial: row lock, amount check, receipt stored) | P1/P2: full state machine, inbox, late-payment refund
C7 | 0.1 (money endpoints disabled on Node) | P1: retire in-memory core
C8 | n/a | P1: move hot path to PG + Redis
C9 | 0.8 (release-expired, docs off, CORS allowlist, headers, basic rate limits on both servers) | P3: WAF, bot rules
C10 | 0.9 | P3: CMEK, AV scan, signed URLs only
H1 | n/a | P2: Redis gate, slot pool, PgBouncer
H2 | n/a | P2: Redis gate, slot pool, PgBouncer
H3 | 0.8 (atomic Redis, shared pool) | P2: full multi-key limits
H4 | n/a | P2: Ed25519, lazy tickets, SMS
H5 | n/a | P2: outbox + Pub/Sub
H6 | n/a | P2: ZSET expiry, batch release
H7 | 0.11 (CI paths, pinned tags, base image) | P1: Alembic; P2: region, per-route auth
M1 | n/a | P1: integer/Decimal money, single rounding fn
M2 | 0.5 (capability tokens) | P2: Ed25519
M3 | n/a | P3
M4 | n/a | P3
M5 | n/a | P3: maker-checker

Legend:
- Phase 0 PR numbers correspond to the PR plan in Section 4 of the prompt
- "n/a" means the finding is closed in Phase 0 and does not recur
- Partial entries mean the Phase 0 PR closes only part of the finding; remaining work continues in later phases
- Finding-to-phase traceability is complete: every finding has exactly one Phase 0 assignment
