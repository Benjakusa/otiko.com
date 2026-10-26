OTIKO FLASH-SALE AUDIT - DEFINITION OF DONE AND FINAL REPORT TEMPLATE
==========================================

Done means: every finding closed or disproven with evidence; every invariant has a test AND a monitor;
load-test results recorded in docs/load-tests/; threat model + pentest report in docs/security/; 
runbooks in docs/runbooks/; and a final report stating measured tickets/minute and tickets/hour, 
the bottleneck at the limit, remaining risks, and cost per sale.

Template (headings and empty tables) for the final report:

FINAL AUDIT REPORT - OTIKO FLASH-SALE
=====================================

Report Date: YYYY-MM-DD
Commit: b3e2deb
Auditor: [Name]

1. EXECUTIVE SUMMARY
-------------------
Measured throughput: ____ tickets/minute (burst), ____ tickets/hour (sustained)
Bottleneck at limit: [describe the limiting component]
Oversell: [0 or quantify if found]
Remaining risks: [list + mitigation status]

2. FINDING REGISTER SUMMARY
---------------------------
Total findings: [count]
  CONFIRMED: [count]
  PARTIAL: [count]
  DISPROVEN: [count]
  NEW: [count]

3. CRITICAL FINDINGS (C1-C10)
-----------------------------
| ID | Status | Evidence (path:line) | Impact | Fix Owner | Phase 0 PR |
|----|--------|----------------------|--------|-----------|------------|
| C1 |        |                      |        |           |            |
| C2 |        |                      |        |           |            |
| ...|        |                      |        |           |            |

4. HIGH FINDINGS (H1-H7)
------------------------
| ID | Status | Evidence (path:line) | Impact | Fix Owner | Phase 0 PR |
|----|--------|----------------------|--------|-----------|------------|
| H1 |        |                      |        |           |            |
| H2 |        |                      |        |           |            |
| ...|        |                      |        |           |            |

5. MEDIUM FINDINGS (M1-M5)
--------------------------
| ID | Status | Evidence (path:line) | Impact | Fix Owner | Phase 0 PR |
|----|--------|----------------------|--------|-----------|------------|
| M1 |        |                      |        |           |            |
| M2 |        |                      |        |           |            |
| ...|        |                      |        |           |            |

6. NEW FINDINGS (N-#)
--------------------
| ID | Status | Evidence (path:line) | Impact | Fix Owner | Phase 0 PR |
|----|--------|----------------------|--------|-----------|------------|
| N1 |        |                      |        |           |            |
| N2 |        |                      |        |           |            |

7. TRACEABILITY MATRIX
----------------------
| Finding | Phase 0 (PR) | Later phase | Status |
|---------|--------------|-------------|--------|
| C1      | 0.1          | n/a         |        |
| C2      | 0.6          | P1          |        |
| ...     | ...          | ...         |        |

8. INVARIANT MONITORING STATUS
-------------------------------
| Invariant | Test Automated | Monitor Running | Last Check | Violation Count |
|-----------|---------------|-----------------|------------|-----------------|
| 1. tickets_sold <= total_quantity |   |   |   |   |
| 2. Paid orders have tickets within 60s p99 |   |   |   |   |
| 3. Unique matching receipt per paid order |   |   |   |   |
| 4. No double-charging per order |   |   |   |   |
| 5. sum(ledger) reconciles to Daraja daily |   |   |   |   |
| 6. Ticket checked in at most once |   |   |   |   |
| 7. Redis loss never causes oversell |   |   |   |   |
| 8. No code path marks paid without Daraja confirmation |   |   |   |   |

9. LOAD TEST RESULTS
--------------------
Test name: _______________
Concurrent users: _______
Peak tickets/minute: _______
Sustained tickets/hour: _______
Bottleneck: _______________
Notes: _______________

10. THREAT MODEL + PENTEST
---------------------------
Threat model: docs/security/threat-model.md
Pentest report: docs/security/pentest-report.md
Last pentest: YYYY-MM-DD
Retest needed: YYYY-MM-DD

11. RUNBOOK STATUS
-------------------
| Runbook | Owner | Rehearsal Date | Status |
|---------|-------|----------------|--------|
| Redis failover |   |   |   |
| PG failover |   |   |   |
| Daraja degraded |   |   |   |
| Callback backlog |   |   |   |
| Oversell suspicion |   |   |   |
| Bot flood |   |   |   |
| Rollback |   |   |   |
| Pause-the-sale |   |   |   |

12. COST PER SALE
-----------------
Infrastructure cost: $____ per sale
Safaricom fees: ____%
Platform fee: ____%
Total cost per ticket: $____
Cost at capacity: $____ per 1K tickets

13. FINAL ASSESSMENT
--------------------
Gate status: PASS / FAIL
  PASS requirements met: [list]
  FAIL requirements missing: [list]
Go/No-Go recommendation: [GO / NO-GO with conditions]
Next steps: [phase 1 actions, if going ahead]
