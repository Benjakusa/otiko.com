OTIKO FLASH-SALE AUDIT - FORENSICS QUERIES AND EXPECTED OUTPUT
==========================================

Read-only forensic scripts and expected output for determining what is actually deployed and live.

--- How to determine what is actually deployed and live ---

1. Check running processes:
   ps aux | grep -E "node|python|redis|postgres" | grep -v grep
2. Check Docker services:
   docker compose -f /otiko/docker-compose.yml ps
3. Check env vars in running containers:
   docker exec otiko-backend env | grep -E "FIREBASE|SECRET|MPESA|QR"
4. Check which database is live (Firestore vs Postgres):
   - Firestore: check if orders collection has documents with status=paid and no mpesa receipt
   - Postgres: select count(*) from orders where status='paid'; select count(*) from orders where mpesa_receipt_number is null
5. Check which server is responding:
   curl -s http://localhost:8000/api/health 2>/dev/null || curl -s http://localhost:3000/health

--- Read-only forensic scripts (do not run against production without authorization) ---

Script 1: Flag paid orders with no stored M-Pesa receipt
---------------------------------------------------------
Postgres query:
  select o.id, o.status, o.total_amount, o.buyerPhone, o.buyerEmail,
         o.mpesa_receipt_number, o.mpesa_checkout_request_id
  from orders o
  where o.status = 'paid'
    and (o.mpesa_receipt_number is null or o.mpesa_receipt_number = '')
  order by o.id;

Expected output: List of paid orders with no receipt number.
  • Note: Node's triggerSimulatedCallback generates a receipt in the payload but never persists it,
  so absence of a receipt is expected for EVERY Node-paid order.
  • The proof of payment must come from the Safaricom statement reconciliation.

Script 2: Orders that went pending -> paid within ~4s of mpesaCheckoutRequestId being set
--------------------------------------------------------------------------------------
Postgres query:
  select o.id, o.status, o.created_at, o.mpesa_checkout_request_id,
         o.updated_at
  from orders o
  where o.status = 'paid'
    and o.mpesa_checkout_request_id is not null
  order by o.updated_at;

Expected output: Orders with timestamps. Look for clusters where updated_at - created_at < 8 seconds
  • This signature matches the simulator's setTimeout(4000ms) + callback pattern (C1).
  • If found, these are simulator-paid orders, not live Daraja payments.

Script 3: Paid orders whose amount does not match a statement line
--------------------------------------------------------------
Postgres query (join with expected statement lines):
  select o.id, o.total_amount, s.amount as statement_amount, s.receipt_number
  from orders o
  join daraja_statement s on s.receipt_number = o.mpesa_receipt_number
  where o.status = 'paid'
    and abs(o.total_amount - s.amount) > 1  -- more than 1 shilling discrepancy;

Expected output: List of discrepancies. Any row here indicates a reconciliation error.

Script 4: Tickets already used for events with unreconciled orders
------------------------------------------------------------------
Postgres query:
  select t.id, t.ticketNumber, t.eventId, t.status, o.id as order_id, o.status as order_status,
         o.total_amount, o.mpesa_receipt_number
  from tickets t
  join orders o on t.orderId = o.id
  where t.status = 'used'
    and o.mpesa_receipt_number is null;

Expected output: Tickets that are used but have no M-Pesa receipt. These are high-priority for
  investigation; may indicate simulator-driven fraud or data corruption.

--- Forensics queries expected output file description ---

This file describes how the owner runs these read-only queries and how to interpret results.
Run these against the production database (or the live data store) and reconcile results with
the Daraja/M-Pesa statement. Do not modify any data.

HUMAN ACTIONS (list exactly; do not block on them, do not attempt them yourself):

1. Pull the Daraja/M-Pesa statement for the live period and reconcile against the forensic output
   (output from Scripts 1-4 above).

2. Rotate all secrets: DB password, SECRET_KEY, QR_SIGNING_SECRET, MPESA_CALLBACK_SECRET,
   Firebase service-account key, SMTP/SendGrid keys, Daraja consumer key/secret/passkey.
   Purge git history ONLY after rotation.

3. If fraudulent orders are found (paid with no receipt, or paid within simulator signature window):
   - Decide on cancelling/voiding tickets
   - Notify affected organizers
   - Confirm legal/regulatory obligations with counsel (Kenya Data Protection Act, 2019)

4. Agree on infrastructure cost ceiling and region/CDN decisions (section 4 defaults).

5. Safaricom shortcode throughput uplift owner confirmation (section 4 defaults).

Note: Items 1-2 are mandatory before Phase 1. Items 3-5 are highly recommended.