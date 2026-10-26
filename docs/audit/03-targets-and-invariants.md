OTIKO FLASH-SALE AUDIT - TARGETS AND INVAR
==========================================

Targets (design to these, with 3x headroom):

Metric | Target
--- | ---
Burst | 20,000 tickets / 60 s = ~333 tickets/s (~170 orders/s at ~2 tickets/order)
Sustained | 500,000 tickets / 3,600 s = ~139 tickets/s (~70 orders/s) for an hour
Stampede | assume 20-50x oversubscription; edge + admission absorb >= 50,000 req/s without touching Postgres
Open holds | ~170 orders/s x 180 s hold = ~30k pending orders (~60k tickets held)
Reserve latency | p95 < 300 ms, p99 < 800 ms for admitted users
Ticket delivery | paid -> delivered p99 < 60 s
Availability | 99.95% during sale; RTO < 2 min; RPO ~ 0 for orders and payments
Oversell | exactly zero

Gate 0: Safaricom must confirm Daraja throughput for the production shortcode in writing;
the payment stage is a rate-controlled valve sized to that number.

Re-derive the capacity math yourself and show the working.

Invariants (each becomes an automated test AND a production monitor):

1. tickets_sold(category) <= total_quantity(category) always.
2. Every paid order has exactly quantity tickets within 60 s (p99), else alert.
3. No order is paid without a unique matching M-Pesa receipt for the exact amount.
4. No customer is charged twice for one order; duplicates are detected and refunded.
5. sum(ledger) reconciles to Daraja statements daily to the shilling.
6. A ticket can be checked in at most once.
7. Redis loss never causes oversell (Postgres slots are authoritative).
8. No code path in a production build can mark an order paid without a verified Daraja confirmation.
