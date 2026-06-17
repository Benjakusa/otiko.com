/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { Event, TicketCategory, Order, Ticket, LedgerEntry, Payout, Organizer } from "./src/types";

const app = express();
const PORT = 3000;

app.use(express.json());

// IN-MEMORY DATABASE STATE (Persistent for runtime session)
let organizers: Organizer[] = [
  {
    id: "org-1",
    firebaseUid: "user-default-uid",
    name: "Sol Generational Group",
    email: "events@solfest.co.ke",
    phone: "0712345678",
    businessName: "Solfest Ltd",
    kycStatus: "verified",
    mpesaPayoutNumber: "254712345678",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

let events: Event[] = [
  {
    id: "evt-1",
    eventCode: "OTK-2026-000101",
    organizerId: "org-1",
    name: "Sol Fest 2026 - Uhuru Gardens",
    flyerUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80&w=800",
    eventDate: "2026-08-15T18:00:00Z",
    venue: "Uhuru Gardens, Langata Road, Nairobi",
    description: "The ultimate celebration of African music, culture, and unity. Sol Fest 2026 returns bigger, bolder, and louder. Join Sol Generation and top guest artists from across the continent for a historic night under the stars.",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "evt-2",
    eventCode: "OTK-2026-000102",
    organizerId: "org-1",
    name: "Sauti Sol Farewell Tour - Live in Nairobi",
    flyerUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=800",
    eventDate: "2026-11-20T19:00:00Z",
    venue: "KICC Plenary Hall, City Square, Nairobi",
    description: "The official, final, and historic culmination of their journey. A curated evening featuring raw vocal orchestrations, nostalgic performances, and a celebratory ledger of their global hit catalog.",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "evt-3",
    eventCode: "OTK-2026-000103",
    organizerId: "org-1",
    name: "Burna Boy Live in Nairobi",
    flyerUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800",
    eventDate: "2026-06-30T17:00:00Z",
    venue: "Nairobi Sports Club, Off Museum Hill",
    description: "The African Giant makes his triumphant return to Kenya. Expect premium stage designs, thunderous acoustics, and the energy of a world-class arena performance.",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

let ticketCategories: TicketCategory[] = [
  {
    id: "cat-1-reg",
    eventId: "evt-1",
    name: "Regular Ticket",
    price: 2500,
    totalQuantity: 2000,
    remainingQuantity: 1845,
    createdAt: new Date().toISOString(),
  },
  {
    id: "cat-1-vip",
    eventId: "evt-1",
    name: "VIP Lounge",
    price: 6000,
    totalQuantity: 500,
    remainingQuantity: 412,
    createdAt: new Date().toISOString(),
  },
  {
    id: "cat-1-vvip",
    eventId: "evt-1",
    name: "VVIP Golden Circle",
    price: 15000,
    totalQuantity: 50,
    remainingQuantity: 14,
    createdAt: new Date().toISOString(),
  },
  {
    id: "cat-2-reg",
    eventId: "evt-2",
    name: "General Admission",
    price: 3500,
    totalQuantity: 1500,
    remainingQuantity: 1210,
    createdAt: new Date().toISOString(),
  },
  {
    id: "cat-2-vip",
    eventId: "evt-2",
    name: "VIP Balcony",
    price: 8500,
    totalQuantity: 300,
    remainingQuantity: 243,
    createdAt: new Date().toISOString(),
  },
  {
    id: "cat-3-reg",
    eventId: "evt-3",
    name: "Regular",
    price: 3000,
    totalQuantity: 5000,
    remainingQuantity: 4280,
    createdAt: new Date().toISOString(),
  },
  {
    id: "cat-3-vip",
    eventId: "evt-3",
    name: "VIP Backstage Pass",
    price: 10000,
    totalQuantity: 200,
    remainingQuantity: 194,
    createdAt: new Date().toISOString(),
  }
];

let orders: Order[] = [
  {
    id: "ord-test-1",
    eventId: "evt-1",
    categoryId: "cat-1-vip",
    buyerName: "Kamau Njoroge",
    buyerPhone: "254711223344",
    buyerEmail: "kamau.njo@gmail.com",
    quantity: 2,
    unitPrice: 6000,
    totalAmount: 12000,
    status: "paid",
    mpesaCheckoutRequestId: "ws_CO_13062026114050678",
    reservedAt: new Date(Date.now() - 3600000).toISOString(),
    expiresAt: new Date(Date.now() - 3300000).toISOString(),
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  }
];

let tickets: Ticket[] = [
  {
    id: "tkt-test-1",
    orderId: "ord-test-1",
    eventId: "evt-1",
    categoryId: "cat-1-vip",
    ticketNumber: 1,
    qrSignature: crypto.createHmac("sha256", "otiko-secret-key").update("tkt-test-1:1").digest("hex"),
    status: "valid",
    issuedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "tkt-test-2",
    orderId: "ord-test-1",
    eventId: "evt-1",
    categoryId: "cat-1-vip",
    ticketNumber: 2,
    qrSignature: crypto.createHmac("sha256", "otiko-secret-key").update("tkt-test-2:2").digest("hex"),
    status: "valid",
    issuedAt: new Date(Date.now() - 3600000).toISOString(),
  }
];

let ledgerEntries: LedgerEntry[] = [
  {
    id: "led-1",
    organizerId: "org-1",
    orderId: "ord-test-1",
    eventId: "evt-1",
    grossAmount: 12000,
    platformFee: 600, // 5% fee
    netAmount: 11400,
    entryType: "sale",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  }
];

let payouts: Payout[] = [];

// HMAC SECRET FOR SIGNING TICKETS
const TICKET_SECRET = process.env.TICKET_SECRET || "otiko-shared-signing-secret-2026";

// SEQUENCE GENERATOR FOR EVENT CODES
let eventCodeCounter = 124;
function generateEventCode(): string {
  const code = eventCodeCounter++;
  return `OTK-2026-${String(code).padStart(6, "0")}`;
}

// SIMULATE SECURITY AUTH MIDDLEWARE Helper
function getOrganizerByToken(req: express.Request): Organizer | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split(" ")[1];
  // Simple simulator: matches UID, or returns standard if token exists
  return organizers.find(o => o.firebaseUid === token) || organizers[0];
}

// ==================== API ENDPOINTS ====================

// --- AUTH & ORGANIZERS ---
app.post("/api/organizers/register", (req, res) => {
  const { firebaseUid, name, email, phone, businessName, mpesaPayoutNumber } = req.body;
  
  if (!firebaseUid || !name || !email) {
    return res.status(400).json({ error: "Missing required profile details" });
  }

  const existing = organizers.find(o => o.firebaseUid === firebaseUid || o.email === email);
  if (existing) {
    return res.json(existing);
  }

  const newOrg: Organizer = {
    id: `org-${crypto.randomUUID().slice(0, 8)}`,
    firebaseUid,
    name,
    email,
    phone: phone || "",
    businessName: businessName || name,
    kycStatus: "pending",
    mpesaPayoutNumber: mpesaPayoutNumber || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  organizers.push(newOrg);
  res.status(201).json(newOrg);
});

app.get("/api/organizers/me", (req, res) => {
  const org = getOrganizerByToken(req);
  if (!org) {
    return res.status(401).json({ error: "Unauthorized organizer authentication" });
  }
  res.json(org);
});

app.patch("/api/organizers/me", (req, res) => {
  const org = getOrganizerByToken(req);
  if (!org) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { name, phone, businessName, mpesaPayoutNumber } = req.body;
  if (name) org.name = name;
  if (phone) org.phone = phone;
  if (businessName) org.businessName = businessName;
  if (mpesaPayoutNumber) org.mpesaPayoutNumber = mpesaPayoutNumber;
  org.updatedAt = new Date().toISOString();

  res.json(org);
});

// KYC Upload mock
app.post("/api/organizers/upload-kyc", (req, res) => {
  const org = getOrganizerByToken(req);
  if (!org) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  org.kycStatus = "pending";
  res.json({ message: "KYC documents uploaded safely to storage and marked pending approval", organizer: org });
});

// --- EVENTS & CATEGORIES ---
app.get("/api/events", (req, res) => {
  const { status, search } = req.query;
  let filtered = [...events];

  if (status) {
    filtered = filtered.filter(e => e.status === status);
  }
  if (search) {
    const q = String(search).toLowerCase();
    filtered = filtered.filter(e => e.name.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q));
  }

  // Inject categories into basic events lists
  const result = filtered.map(evt => {
    const cats = ticketCategories.filter(tc => tc.eventId === evt.id);
    const minPrice = cats.reduce((min, cat) => cat.price < min ? cat.price : min, cats[0]?.price || 0);
    const maxPrice = cats.reduce((max, cat) => cat.price > max ? cat.price : max, cats[0]?.price || 0);
    const isSoldOut = cats.every(c => c.remainingQuantity <= 0);
    return {
      ...evt,
      categories: cats,
      minPrice,
      maxPrice,
      isSoldOut
    };
  });

  res.json(result);
});

app.get("/api/events/:code", (req, res) => {
  const { code } = req.params;
  const evt = events.find(e => e.eventCode === code);
  if (!evt) {
    return res.status(404).json({ error: "Event not found" });
  }

  const cats = ticketCategories.filter(tc => tc.eventId === evt.id);
  const minPrice = cats.reduce((min, cat) => cat.price < min ? cat.price : min, cats[0]?.price || 0);
  const maxPrice = cats.reduce((max, cat) => cat.price > max ? cat.price : max, cats[0]?.price || 0);
  const isSoldOut = cats.every(c => c.remainingQuantity <= 0);

  res.json({
    ...evt,
    categories: cats,
    minPrice,
    maxPrice,
    isSoldOut
  });
});

app.post("/api/events", (req, res) => {
  const org = getOrganizerByToken(req);
  if (!org) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { name, flyerUrl, eventDate, venue, description, categories } = req.body;
  if (!name || !eventDate || !venue || !categories || !Array.isArray(categories)) {
    return res.status(400).json({ error: "Missing required event fields" });
  }

  const newEventId = `evt-${crypto.randomUUID().slice(0, 8)}`;
  const eventCode = generateEventCode();

  const newEvt: Event = {
    id: newEventId,
    eventCode,
    organizerId: org.id,
    name,
    flyerUrl: flyerUrl || "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80&w=800",
    eventDate,
    venue,
    description: description || "",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  events.push(newEvt);

  const formattedCats: TicketCategory[] = categories.map((c: any, index: number) => {
    return {
      id: `cat-${newEventId.slice(4)}-${index}`,
      eventId: newEventId,
      name: c.name || `Category ${index + 1}`,
      price: Number(c.price),
      totalQuantity: Number(c.totalQuantity),
      remainingQuantity: Number(c.totalQuantity),
      createdAt: new Date().toISOString()
    };
  });

  ticketCategories.push(...formattedCats);

  res.status(201).json({
    ...newEvt,
    categories: formattedCats
  });
});

app.patch("/api/events/:code", (req, res) => {
  const org = getOrganizerByToken(req);
  if (!org) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { code } = req.params;
  const evt = events.find(e => e.eventCode === code);
  if (!evt) {
    return res.status(404).json({ error: "Event not found" });
  }

  if (evt.organizerId !== org.id) {
    return res.status(403).json({ error: "You do not own this event" });
  }

  const { name, flyerUrl, eventDate, venue, description, status } = req.body;
  if (name) evt.name = name;
  if (flyerUrl) evt.flyerUrl = flyerUrl;
  if (eventDate) evt.eventDate = eventDate;
  if (venue) evt.venue = venue;
  if (description) evt.description = description;
  if (status) evt.status = status;
  
  evt.updatedAt = new Date().toISOString();

  res.json(evt);
});

app.delete("/api/events/:code", (req, res) => {
  const org = getOrganizerByToken(req);
  if (!org) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { code } = req.params;
  const evtIndex = events.findIndex(e => e.eventCode === code);
  if (evtIndex === -1) {
    return res.status(404).json({ error: "Event not found" });
  }

  const evt = events[evtIndex];
  if (evt.organizerId !== org.id) {
    return res.status(403).json({ error: "You do not own this event" });
  }

  // Soft delete by setting status to cancelled
  evt.status = "cancelled";
  evt.updatedAt = new Date().toISOString();

  res.json({ success: true, message: "Event cancelled successfully.", event: evt });
});

app.get("/api/events/:code/tickets", (req, res) => {
  const org = getOrganizerByToken(req);
  if (!org) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { code } = req.params;
  const evt = events.find(e => e.eventCode === code);
  if (!evt) {
    return res.status(404).json({ error: "Event not found" });
  }

  if (evt.organizerId !== org.id) {
    return res.status(403).json({ error: "You do not own this event" });
  }

  const eventTickets = tickets.filter(t => t.eventId === evt.id);
  
  if (req.query.export === "csv") {
    // Generate CSV string
    let csv = "Ticket ID,Category,Ticket Number,Buyer Name,Buyer Email,Buyer Phone,Status,Issued At\n";
    eventTickets.forEach(t => {
      const order = orders.find(o => o.id === t.orderId);
      const cat = ticketCategories.find(c => c.id === t.categoryId);
      csv += `"${t.id}","${cat?.name || "N/A"}",${t.ticketNumber},"${order?.buyerName || "N/A"}","${order?.buyerEmail || "N/A"}","${order?.buyerPhone || "N/A"}","${t.status}","${t.issuedAt || "N/A"}"\n`;
    });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=attendees_${code}.csv`);
    return res.send(csv);
  }

  res.json(eventTickets);
});

// --- ORDERS & RESERVATIONS (ATOMIC DECREMENT LOGIC) ---
app.post("/api/orders/reserve", (req, res) => {
  const { categoryId, quantity, buyerName, buyerPhone, buyerEmail } = req.body;
  const qty = Number(quantity);

  if (!categoryId || !buyerName || !buyerPhone || !buyerEmail || isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: "Invalid booking request parameters" });
  }

  // Find Category
  const categoryIndex = ticketCategories.findIndex(c => c.id === categoryId);
  if (categoryIndex === -1) {
    return res.status(404).json({ error: "Ticket category not found" });
  }

  const category = ticketCategories[categoryIndex];
  const evt = events.find(e => e.id === category.eventId);

  if (!evt || evt.status !== "active") {
    return res.status(400).json({ error: "This event is not actively accepting reservations" });
  }

  if (new Date(evt.eventDate).getTime() < Date.now()) {
    return res.status(400).json({ error: "This event date has already passed" });
  }

  // HIGH-CONCURRENCY ATOMIC DECREMENT PATTERN (In-memory representation of postgres UPDATE CHECK)
  if (category.remainingQuantity < qty) {
    return res.status(409).json({ error: "NOT_ENOUGH_TICKETS", message: "Requested ticket count exceeds remaining category tickets." });
  }

  // Decrement atomically
  category.remainingQuantity -= qty;

  const totalAmount = category.price * qty;
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

  const newOrder: Order = {
    id: `ord-${crypto.randomUUID().slice(0, 8)}`,
    eventId: category.eventId,
    categoryId: categoryId,
    buyerName,
    buyerPhone,
    buyerEmail,
    quantity: qty,
    unitPrice: category.price,
    totalAmount,
    status: "pending",
    reservedAt: new Date().toISOString(),
    expiresAt,
    createdAt: new Date().toISOString(),
  };

  orders.push(newOrder);

  // Auto-expire reservation queue sweeper trigger simulations local
  setTimeout(() => {
    const latestOrder = orders.find(o => o.id === newOrder.id);
    if (latestOrder && latestOrder.status === "pending") {
      latestOrder.status = "expired";
      // Restores ticket count atomically
      const cat = ticketCategories.find(c => c.id === latestOrder.categoryId);
      if (cat) {
        cat.remainingQuantity += latestOrder.quantity;
      }
      console.log(`[Sweeper] Order ${latestOrder.id} has expired of inactivity. Ticket reservations released.`);
    }
  }, 5 * 60 * 1000);

  res.status(201).json(newOrder);
});

app.get("/api/orders/:id", (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  const event = events.find(e => e.id === order.eventId);
  const category = ticketCategories.find(c => c.id === order.categoryId);

  res.json({
    ...order,
    event,
    category
  });
});

// --- M-PESA DARAJA STK-PUSH INTEGRATION SIMULATOR ---
app.post("/api/mpesa/initiate/:orderId", (req, res) => {
  const { orderId } = req.params;
  const { phoneNumber } = req.body;

  const order = orders.find(o => o.id === orderId);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  if (order.status !== "pending") {
    return res.status(400).json({ error: `Cannot process payment on order with status ${order.status}` });
  }

  // Generate simulated checkout request id
  const checkoutRequestId = `ws_CO_${Date.now().toString().slice(-8)}_${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
  order.mpesaCheckoutRequestId = checkoutRequestId;
  
  // Format clean kenyan number if needed (e.g., 2547XXXXXXXX or 07XXXXXXXX)
  let cleanPhone = phoneNumber || order.buyerPhone;
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "254" + cleanPhone.slice(1);
  }

  console.log(`[Daraja STK Push] Sending Push request for ${order.totalAmount} KES to ${cleanPhone}.. RequestId: ${checkoutRequestId}`);

  // Simulating Safaricom Async Callback Flow
  // SAFARICOM STK Callback normally hits webhook in 5-15 seconds
  setTimeout(() => {
    // Check if order wasn't manual cancelled or already paid
    const currentOrder = orders.find(o => o.id === orderId);
    if (currentOrder && currentOrder.status === "pending") {
      // Simulate SUCCESS CALLBACK 90% of times, otherwise simulate cancel
      const success = true; 
      
      const callbackPayload = {
        Body: {
          stkCallback: {
            MerchantRequestID: "12345-67890",
            CheckoutRequestID: checkoutRequestId,
            ResultCode: success ? 0 : 1032,
            ResultDesc: success ? "The service request processed successfully." : "Request cancelled by user.",
            CallbackMetadata: success ? {
              Item: [
                { Name: "Amount", Value: currentOrder.totalAmount },
                { Name: "MpesaReceiptNumber", Value: `QKF${crypto.randomBytes(4).toString("hex").toUpperCase()}` },
                { Name: "TransactionDate", Value: Date.now() },
                { Name: "PhoneNumber", Value: Number(cleanPhone) }
              ]
            } : null
          }
        }
      };

      // Internal call to callback route simulates Safaricom callback trigger
      triggerSimulatedCallback(callbackPayload);
    }
  }, 4000);

  res.json({
    status: "initiated",
    message: "STK Push prompted successfully on user handset. Please enter MPESA PIN on mobile screen.",
    mpesaCheckoutRequestId: checkoutRequestId,
    expiresAt: order.expiresAt
  });
});

// SIMULATE INTERNAL WEBHOOK CALL
function triggerSimulatedCallback(payload: any) {
  const { CheckoutRequestID, ResultCode, CallbackMetadata } = payload.Body.stkCallback;
  const order = orders.find(o => o.mpesaCheckoutRequestId === CheckoutRequestID);

  if (!order) {
    console.error(`[M-Pesa Webhook Warning] Received callback for unknown token: ${CheckoutRequestID}`);
    return;
  }

  if (order.status !== "pending") {
    console.log(`[M-Pesa Webhook] Already processed order: ${order.id}. Status is currently: ${order.status}`);
    return;
  }

  if (ResultCode === 0) {
    // SUCCESS
    order.status = "paid";
    console.log(`[M-Pesa Webhook SUCCESS] Order: ${order.id} is now FULLY PAID.`);

    // 1. Create Ledger entries for organizer finance and clear fees
    const event = events.find(e => e.id === order.eventId);
    if (event) {
      const gross = order.totalAmount;
      const fee = Math.round(gross * 0.05 * 100) / 100; // 5% fee rounded
      const net = gross - fee;

      ledgerEntries.push({
        id: `led-${crypto.randomUUID().slice(0, 8)}`,
        organizerId: event.organizerId,
        orderId: order.id,
        eventId: order.id,
        grossAmount: gross,
        platformFee: fee,
        netAmount: net,
        entryType: "sale",
        createdAt: new Date().toISOString()
      });
    }

    // 2. Generate secure ticket payload and sign QR codes code
    for (let i = 0; i < order.quantity; i++) {
      const ticketId = `tkt-${crypto.randomUUID().slice(0, 8)}`;
      // SECURE SIGNATURE
      const qrSignature = crypto.createHmac("sha256", TICKET_SECRET).update(`${ticketId}:${i + 1}`).digest("hex");
      tickets.push({
        id: ticketId,
        orderId: order.id,
        eventId: order.id,
        categoryId: order.categoryId,
        ticketNumber: i + 1,
        qrSignature,
        status: "valid",
        issuedAt: new Date().toISOString()
      });
    }
  } else {
    // FAIL OR CANCEL
    order.status = "failed";
    console.log(`[M-Pesa Webhook FAILURE] Pay cancel code: ${ResultCode} for Order: ${order.id}. Releasing reservation.`);
    
    // Release inventory
    const cat = ticketCategories.find(c => c.id === order.categoryId);
    if (cat) {
      cat.remainingQuantity += order.quantity;
    }
  }
}

// manual route for simulate admin direct test webhook callback
app.post("/api/mpesa/simulated-callback", (req, res) => {
  const { checkoutRequestId, success } = req.body;
  const order = orders.find(o => o.mpesaCheckoutRequestId === checkoutRequestId);
  if (!order) {
    return res.status(404).json({ error: "Order checkout code not found" });
  }

  const payload = {
    Body: {
      stkCallback: {
        CheckoutRequestID: checkoutRequestId,
        ResultCode: success ? 0 : 1032,
        ResultDesc: success ? "Success direct" : "Cancel manual",
        CallbackMetadata: success ? {
          Item: [{ Name: "Amount", Value: order.totalAmount }]
        } : null
      }
    }
  };

  triggerSimulatedCallback(payload);
  res.json({ message: "Webhook mock callback processed successfully", orderStatus: order.status });
});

// --- TICKETS AND PDF GENERATION MOCK ---
app.get("/api/orders/:orderId/tickets", (req, res) => {
  const { orderId } = req.params;
  const tList = tickets.filter(t => t.orderId === orderId);
  res.json(tList);
});

// Ticket verification scanning endpoint
app.post("/api/tickets/:id/verify", (req, res) => {
  const { id } = req.params;
  const { qrSignature } = req.body; // Secure verify signature

  const ticket = tickets.find(t => t.id === id);
  if (!ticket) {
    return res.status(404).json({ valid: false, error: "Ticket does not exist in Otiko secure database." });
  }

  // Re-verify HMAC to prevent spoofing
  const expectedSig = crypto.createHmac("sha256", TICKET_SECRET).update(`${ticket.id}:${ticket.ticketNumber}`).digest("hex");
  
  if (ticket.qrSignature !== qrSignature && expectedSig !== qrSignature) {
    return res.status(400).json({ valid: false, error: "QR Code Signature match failed. Spoofed Ticket detected." });
  }

  if (ticket.status !== "valid") {
    return res.json({ 
      valid: false, 
      error: `Ticket has already been ${ticket.status.toUpperCase()}`,
      usedAt: ticket.usedAt 
    });
  }

  // Mark ticket as scanned/used
  ticket.status = "used";
  ticket.usedAt = new Date().toISOString();

  const event = events.find(e => e.id === ticket.eventId || orders.find(o => o.id === ticket.orderId)?.eventId === e.id);
  const category = ticketCategories.find(c => c.id === ticket.categoryId);
  const order = orders.find(o => o.id === ticket.orderId);

  res.json({
    valid: true,
    message: "Ticket scanned successfully! Gate access granted.",
    ticket: {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      buyerName: order?.buyerName,
      categoryName: category?.name,
      eventName: event?.name,
      scannedAt: ticket.usedAt
    }
  });
});

// --- WALLET & ORGANIZER FINANCES ---
app.get("/api/wallet/overview", (req, res) => {
  const org = getOrganizerByToken(req);
  if (!org) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Find all events for organizer
  const orgEventIds = events.filter(e => e.organizerId === org.id).map(e => e.id);
  
  // Dynamic calculation from append-only ledger entries
  const orgLedgers = ledgerEntries.filter(le => le.organizerId === org.id);
  const grossCollected = orgLedgers
    .filter(l => l.entryType === "sale")
    .reduce((sum, item) => sum + item.grossAmount, 0);

  const platformFees = orgLedgers
    .filter(l => l.entryType === "sale")
    .reduce((sum, item) => sum + item.platformFee, 0);

  const approvedPayoutsSum = payouts
    .filter(p => p.organizerId === org.id && ["completed", "approved", "processing"].includes(p.status))
    .reduce((sum, item) => sum + item.amount, 0);

  const netBalance = grossCollected - platformFees;
  const availableBalance = Math.max(0, netBalance - approvedPayoutsSum);

  res.json({
    grossCollected,
    platformFees,
    netBalance,
    availableBalance,
    ledger: orgLedgers,
    payouts: payouts.filter(p => p.organizerId === org.id)
  });
});

app.post("/api/wallet/payout-request", (req, res) => {
  const org = getOrganizerByToken(req);
  if (!org) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { amount } = req.body;
  const withdrawAmount = Number(amount);
  if (isNaN(withdrawAmount) || withdrawAmount <= 100) {
    return res.status(400).json({ error: "Minimum payout threshold is KES 100" });
  }

  // Double-check real available balance
  const orgLedgers = ledgerEntries.filter(le => le.organizerId === org.id);
  const grossCollected = orgLedgers.filter(l => l.entryType === "sale").reduce((sum, item) => sum + item.grossAmount, 0);
  const platformFees = orgLedgers.filter(l => l.entryType === "sale").reduce((sum, item) => sum + item.platformFee, 0);
  const approvedPayoutsSum = payouts.filter(p => p.organizerId === org.id && ["completed", "approved", "processing"].includes(p.status)).reduce((sum, item) => sum + item.amount, 0);
  const availableBalance = (grossCollected - platformFees) - approvedPayoutsSum;

  if (withdrawAmount > availableBalance) {
    return res.status(400).json({ error: "Insufficient available wallet balance for requested payout amount." });
  }

  const newPayout: Payout = {
    id: `pay-${crypto.randomUUID().slice(0, 8)}`,
    organizerId: org.id,
    amount: withdrawAmount,
    status: "requested",
    requestedAt: new Date().toISOString()
  };

  payouts.push(newPayout);

  // Auto-approve simulation for sandbox experience in 5 seconds
  setTimeout(() => {
    const payItem = payouts.find(p => p.id === newPayout.id);
    if (payItem) {
      payItem.status = "completed";
      payItem.mpesaTransactionId = `TXN${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
      payItem.processedAt = new Date().toISOString();
      
      // Post Ledger payout debit entry
      ledgerEntries.push({
        id: `led-${crypto.randomUUID().slice(0, 8)}`,
        organizerId: org.id,
        orderId: "",
        eventId: "",
        grossAmount: -withdrawAmount,
        platformFee: 0,
        netAmount: -withdrawAmount,
        entryType: "payout",
        createdAt: new Date().toISOString()
      });
      console.log(`[Payout Sweeper] Auto-processed payout requests of KES ${withdrawAmount} to M-Pesa registered wallet.`);
    }
  }, 6000);

  res.status(201).json(newPayout);
});


// ==================== VITE DEVELOPMENT MIDDLEWARE / PRODUCTION ASSET ROUTING ====================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve client router for all other client-side routes
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Otiko Full-Stack Engine booting correctly on http://localhost:${PORT}`);
  });
}

startServer();
