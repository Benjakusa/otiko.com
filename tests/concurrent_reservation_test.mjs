import http from "http";

const BASE = "http://localhost:3000";

function fetchJson(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const payload = opts.body ? JSON.stringify(opts.body) : null;
    const req = http.request(
      url,
      {
        method: opts.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  // 1. Create a test event with category: 5 tickets
  const createRes = await fetchJson("/api/events/ping", { method: "GET" }).catch(() => ({ status: 0 }));
  if (createRes.status === 0) {
    console.error("Server not reachable at", BASE);
    process.exit(1);
  }

  const cat = await fetchJson("/api/events", { method: "GET" });
  console.log("Existing events:", cat.body?.length || 0);

  // Create event (no auth needed for this in simulated mode)
  const eventRes = await fetchJson("/api/events", {
    method: "POST",
    body: {
      name: "Oversell Test Event",
      eventDate: new Date(Date.now() + 86400000).toISOString(),
      venue: "Test Venue",
      categories: [{ name: "Standard", price: 1000, totalQuantity: 5 }],
    },
  });

  if (eventRes.status !== 201) {
    console.error("Failed to create event", eventRes.status, eventRes.body);
    process.exit(1);
  }

  const catId = eventRes.body.categories[0].id;
  console.log(`Created event, category ID: ${catId} (5 tickets)`);

  // 2. Fire 10 concurrent reserve requests
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(
      fetchJson("/api/orders/reserve", {
        method: "POST",
        body: {
          categoryId: catId,
          quantity: 1,
          buyerName: `Buyer ${i}`,
          buyerPhone: `254700000${String(i).padStart(2, "0")}`,
          buyerEmail: `buyer${i}@test.com`,
        },
      })
    );
  }

  const results = await Promise.all(promises);

  // 3. Analyze
  const successes = results.filter((r) => r.status === 201);
  const conflicts = results.filter((r) => r.status === 409);
  const others = results.filter((r) => r.status !== 201 && r.status !== 409);

  console.log(`\n--- RESULTS ---`);
  console.log(`201 Created (success):  ${successes.length}`);
  console.log(`409 Conflict (rejected): ${conflicts.length}`);
  console.log(`Other statuses:         ${others.length}`);
  if (others.length) console.log("Other responses:", others.map((r) => `${r.status}: ${JSON.stringify(r.body)}`).join("\n"));

  if (successes.length <= 5) {
    console.log("\nPASS: No overselling detected");
  } else {
    console.log(`\nFAIL: Oversold! ${successes.length} reservations succeeded for 5 available tickets`);
  }
}

main().catch(console.error);
