import fs from "fs";

let content = fs.readFileSync("server.ts", "utf8");

const search = `  if (ResultCode === 0) {
    order.status = "paid";
      };
      ledgerEntries.push(entry);
      await syncSet("ledgerEntries", entry.id, entry);
    }`;

const replacement = `  if (ResultCode === 0) {
    order.status = "paid";
    await syncUpdate("orders", order.id, { status: "paid" });
    log.info(\`[M-Pesa] Order \${order.id} PAID.\`);

    const event = events.find(e => e.id === order.eventId);
    if (event) {
      const grossCents = Math.round(order.totalAmount * 100);
      const feeCents = Math.round(grossCents * 0.05);
      const netCents = grossCents - feeCents;

      const gross = grossCents / 100;
      const fee = feeCents / 100;
      const net = netCents / 100;

      const entry: LedgerEntry = {
        id: \`led-\${docId()}\`, organizerId: event.organizerId,
        orderId: order.id, eventId: order.eventId,
        grossAmount: gross, platformFee: fee, netAmount: net,
        entryType: "sale", createdAt: new Date().toISOString()
      };
      ledgerEntries.push(entry);
      await syncSet("ledgerEntries", entry.id, entry);
    }`;

if (content.includes(search)) {
  fs.writeFileSync("server.ts", content.replace(search, replacement));
  console.log("Fixed server.ts successfully");
} else {
  console.log("Could not find search string.");
}
