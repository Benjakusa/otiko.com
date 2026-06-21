/**
 * Concurrent reservation overselling test.
 *
 * Tests the Express in-memory reservation path by verifying that the
 * check-then-decrement logic is safe within a single Node.js process,
 * and documents what happens at 2+ instances.
 */

// Simulate the exact Express reservation logic
const ticketCategories = [];
const events = [];
const orders = [];

function docId() {
  return Math.random().toString(36).slice(2, 10);
}

// --- Create seed data ---
const eventId = `evt-${docId()}`;
const catId = `cat-${eventId.slice(4)}-0`;

events.push({
  id: eventId,
  eventCode: "TEST001",
  name: "Concurrency Test",
  eventDate: new Date(Date.now() + 86400000).toISOString(),
  status: "active",
});

ticketCategories.push({
  id: catId,
  eventId,
  name: "Standard",
  price: 1000,
  totalQuantity: 5,
  remainingQuantity: 5,
});

// --- Concurrent reservation simulation ---
// Mimics the Express reservation logic at server.ts:702-745
async function reserveTicket(catId, qty, buyerIdx) {
  const i = ticketCategories.findIndex((c) => c.id === catId);
  if (i === -1) return { status: 404, error: "Not found" };

  const cat = ticketCategories[i];
  const evt = events.find((e) => e.id === cat.eventId);
  if (!evt || evt.status !== "active") return { status: 400, error: "Not active" };
  if (new Date(evt.eventDate).getTime() < Date.now()) return { status: 400, error: "Past event" };

  // *** THIS IS THE CRITICAL CHECK ***
  if (cat.remainingQuantity < qty) {
    return { status: 409, error: "NOT_ENOUGH_TICKETS" };
  }

  // *** THIS IS THE CRITICAL DECREMENT ***
  cat.remainingQuantity -= qty;

  // Simulate async Firestore write (yields event loop)
  await new Promise((r) => setTimeout(r, 1));

  const order = {
    id: `ord-${docId()}`,
    categoryId: catId,
    quantity: qty,
    totalAmount: cat.price * qty,
    status: "pending",
  };
  orders.push(order);

  return { status: 201, order };
}

async function runTest() {
  // Fire 10 concurrent reservations for 5 tickets
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(reserveTicket(catId, 1, i));
  }

  const results = await Promise.all(promises);

  const successes = results.filter((r) => r.status === 201).length;
  const conflicts = results.filter((r) => r.status === 409).length;

  console.log(`\n=== CONCURRENT RESERVATION TEST ===`);
  console.log(`Available tickets:  5`);
  console.log(`Requests sent:      10`);
  console.log(`201 Created:        ${successes}`);
  console.log(`409 Conflict:       ${conflicts}`);

  const remaining = ticketCategories[0].remainingQuantity;
  console.log(`Remaining tickets:  ${remaining}`);
  console.log(`Total sold:         ${5 - remaining}`);

  if (successes <= 5 && remaining >= 0) {
    console.log(`\nPASS: No overselling. Single-process Node.js check-then-decrement`);
    console.log(`      is safe because both operations run in the same microtask`);
    console.log(`      before any 'await' yields the event loop.`);
  } else {
    console.log(`\nFAIL: Oversold!`);
  }

  console.log(`\n--- Multi-instance analysis ---`);
  console.log(`With 2+ Express instances behind a load balancer, each instance`);
  console.log(`has its own in-memory ticketCategories[] — no coordination.`);
  console.log(`If instance A has 5 tickets and instance B has 5 tickets (stale),`);
  console.log(`both can sell the "last" ticket. Total sold > total available.`);
  console.log(`Redis is needed when scaling horizontally. Postgres-backed`);
  console.log(`FastAPI path is already safe due to atomic UPDATE.`);
}

runTest().catch(console.error);
