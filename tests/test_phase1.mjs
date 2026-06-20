// tests/test_phase1.mjs
// Reproduce race condition between order expiry and M-Pesa callback

let orders = [];
let ticketCategories = [];
let tickets = [];

function docId() {
  return Math.random().toString(36).slice(2, 10);
}

// Mock async DB update
async function syncUpdate(collection, id, data) {
  // Yield event loop
  await new Promise(r => setTimeout(r, 2));
}

// Mock Redis lock
const redis = {
  async set(key, val, opts) {
    await new Promise(r => setTimeout(r, 5)); // Simulate network latency
    return true; // Acquired
  }
};

async function expireOrder(newOrder) {
  const latestOrder = orders.find(o => o.id === newOrder.id);
  if (latestOrder && latestOrder.status === "pending") {
    latestOrder.status = "expired";
    const cat = ticketCategories.find(c => c.id === latestOrder.categoryId);
    if (cat) {
      cat.remainingQuantity += latestOrder.quantity;
      await syncUpdate("ticketCategories", cat.id, { remainingQuantity: cat.remainingQuantity }).catch(() => {});
    }
    await syncUpdate("orders", latestOrder.id, { status: "expired" }).catch(() => {});
  }
}

async function triggerSimulatedCallback(CheckoutRequestID, ResultCode) {
  const order = orders.find(o => o.mpesaCheckoutRequestId === CheckoutRequestID);
  if (!order) return;
  if (order.status !== "pending") return;

  const lockKey = `mpesa:processed:${CheckoutRequestID}`;
  const locked = await redis.set(lockKey, "1", { NX: true, EX: 86400 });
  if (!locked) return;

  // FIX: Re-check status after async yield
  if (order.status !== "pending") return;

  if (ResultCode === 0) {
    order.status = "paid";
    await syncUpdate("orders", order.id, { status: "paid" });

    // Generate tickets
    for (let i = 0; i < order.quantity; i++) {
      tickets.push({ id: `tkt-${docId()}`, orderId: order.id });
    }
  }
}

async function runTest() {
  let doubleBookedCount = 0;
  const RUNS = 20;

  for (let i = 0; i < RUNS; i++) {
    // Reset state
    const catId = `cat-${i}`;
    ticketCategories = [{ id: catId, remainingQuantity: 0 }]; // 0 means order took the last ones
    orders = [{
      id: `ord-${i}`,
      categoryId: catId,
      status: "pending",
      quantity: 2,
      mpesaCheckoutRequestId: `checkout-${i}`
    }];
    tickets = [];

    const order = orders[0];

    // Fire callback
    const p1 = triggerSimulatedCallback(order.mpesaCheckoutRequestId, 0);

    // Fire expiry exactly when callback yields on Redis (simulate concurrency)
    await new Promise(r => setTimeout(r, 1)); 
    const p2 = expireOrder(order);

    await Promise.all([p1, p2]);

    const finalCat = ticketCategories.find(c => c.id === catId);
    
    // If order is paid, tickets are generated, BUT remaining quantity was also restored = Double Booked!
    if (order.status === "paid" && tickets.length === 2 && finalCat.remainingQuantity === 2) {
      doubleBookedCount++;
    }
  }

  console.log(`\n--- RACE CONDITION REPRODUCTION ---`);
  console.log(`Runs: ${RUNS}`);
  console.log(`Double-booked (Oversold): ${doubleBookedCount}`);
  if (doubleBookedCount > 0) {
    console.log(`FAIL: Race condition triggered! Tickets were released to pool AND order was marked paid.`);
  } else {
    console.log(`PASS: Safe.`);
  }
}

runTest().catch(console.error);
