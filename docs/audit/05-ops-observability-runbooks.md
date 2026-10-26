OTIKO FLASH-SALE AUDIT - OPS AND OBSERVABILITY
==========================================

OpenTelemetry tracing edge -> API -> Redis -> PG -> Daraja -> workers;
RED + USE dashboards; SLOs with burn-rate; live invariant monitors (Section D3) that page on
violation; a synthetic buyer every minute against a zero-priced internal event.

Runbooks (owner + rehearsal date for each):

1. Redis failover + rebuild
   Owner: Jakusa
   Rehearsal: Day -7 before launch
   Steps: promote replica, rebuild primary from PG dump, warm Redis cache, verify seq numbers

2. PG failover
   Owner: Jakusa
   Rehearsal: Day -7 before launch
   Steps: trigger patroni/switchover, verify connection pool rebalances, run invariant checks

3. Daraja degraded/down
   Owner: Safaricom contact / Jakusa
   Rehearsal: Day -7 before launch
   Steps: switch to sandbox mode; if sandbox unavailable, activate PAYMENTS_ENABLED=false kill-switch;
   all orders show "temporarily paused" maintenance state; manual receipt reconciliation reconciliation reconciliation reconciliation

4. Callback backlog
   Owner: Jakusa
   Rehearsal: Day -3 before launch
   Steps: inspect inbox queue; reprocess stale entries; verify idempotency; alert if >100 pending

5. Oversell suspicion
   Owner: Jakusa / SRE
   Rehearsal: Day -3 before launch
   Steps: check tickets_sold vs total_quantity per category; if violation, page on-call; rollback
   affected tickets; reconcile ledger

6. Bot flood
   Owner: Jakusa / Security
   Rehearsal: Day -3 before launch
   Steps: engage WAF challenge mode; increase Turnstile difficulty; reduce per-IP cap; alert team

7. Rollback
   Owner: Jakusa
   Rehearsal: Day -5 before launch
   Steps: PAYMENTS_ENABLED=false; drain Redis; PG restore to pre-sale snapshot; redeploy previous
image tag; notify organizers

8. Pause-the-sale
   Owner: Jakusa
   Rehearsal: Day -5 before launch
   Steps: set PAYMENTS_ENABLED=false; broadcast maintenance state to front-end; freeze all orders;
   communicate to organizers

Synthetic buyer: a cron job running every minute against a zero-priced internal event that:
- reserves 2 tickets
- completes STK push simulation
- queries status
- verifies invariants (oversell, double-booking, ledger reconciliation mismatch)

If any invariant fails, page on-call immediately.

Two game days before launch:
- Kill Redis primary, fail over PG, verify invariants still hold
- Daraja +30 s latency and 30% 5xx tolerance
- Duplicate / out-of-order / 10-minute-late transaction scenarios
- Lose API instances; verify failover still passes invariants
