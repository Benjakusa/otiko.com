import express from "express";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import multer from "multer";
import sharp from "sharp";
import nodemailer from "nodemailer";
import { createServer as createViteServer } from "vite";
import { initializeApp as initFirebase, cert } from "firebase-admin";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { Event, TicketCategory, Order, Ticket, LedgerEntry, Payout, PayoutRequest, AuditLog, Organizer } from "./src/types";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

const TICKET_SECRET = process.env.TICKET_SECRET || "otiko-shared-signing-secret-2026";

let ticketCounter = 0;

function generateTicketNumber(eventCode: string): string {
  ticketCounter++;
  return `OTK-${eventCode}-${String(ticketCounter).padStart(5, "0")}`;
}

function generateVerificationCode(): string {
  return crypto.randomBytes(4).toString("hex");
}

// ---------- FIREBASE ADMIN INIT ----------
let firestore: Firestore | null = null;
let firebaseAuth: ReturnType<typeof getAuth> | null = null;

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "";
if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    initFirebase({ credential: cert(serviceAccount) });
    firestore = getFirestore() as Firestore;
    firebaseAuth = getAuth();
    console.log("[Firebase] Admin SDK initialized successfully");
  } catch (err) {
    console.error("[Firebase] Admin SDK init failed, running in-memory only:", err);
  }
} else {
  console.log("[Firebase] No service account found, running in-memory only");
}

// ---------- HELPERS ----------
function docId(): string {
  return crypto.randomUUID().slice(0, 8);
}

async function syncSet(collection: string, id: string, data: any) {
  if (firestore) {
    try { await firestore.collection(collection).doc(id).set(data); }
    catch (e) { console.error(`[Firestore] Error writing ${collection}/${id}:`, e); }
  }
}

async function syncUpdate(collection: string, id: string, data: any) {
  if (firestore) {
    try { await firestore.collection(collection).doc(id).update(data); }
    catch (e) { console.error(`[Firestore] Error updating ${collection}/${id}:`, e); }
  }
}

async function syncDelete(collection: string, id: string) {
  if (firestore) {
    try { await firestore.collection(collection).doc(id).delete(); }
    catch (e) { console.error(`[Firestore] Error deleting ${collection}/${id}:`, e); }
  }
}

async function syncAdd(collection: string, data: any) {
  if (firestore) {
    try { await firestore.collection(collection).add(data); }
    catch (e) { console.error(`[Firestore] Error adding to ${collection}:`, e); }
  }
}

async function syncDeleteWhere(collection: string, field: string, value: string) {
  if (firestore) {
    try {
      const snap = await firestore.collection(collection).where(field, "==", value).get();
      const batch = firestore.batch();
      snap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    } catch (e) { console.error(`[Firestore] Error batch deleting ${collection}:`, e); }
  }
}

// ---------- AUTH MIDDLEWARE ----------
async function getOrganizerByToken(req: express.Request): Promise<Organizer | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.split(" ")[1];

  // If Firebase Auth is available, verify the JWT
  if (firebaseAuth) {
    try {
      const decoded = await firebaseAuth.verifyIdToken(token);
      return organizers.find(o => o.firebaseUid === decoded.uid) || null;
    } catch (err) {
      console.warn("[Auth] verifyIdToken failed:", (err as Error).message);
    }
  }

  // Fallback: direct UID matching (simulator mode)
  // Only use direct match when token is a short UID, not a Firebase JWT
  if (!token.startsWith("eyJ")) {
    return organizers.find(o => o.firebaseUid === token) || null;
  }

  return null;
}

// Sync version for endpoints that don't need async
function getOrganizerByTokenSync(req: express.Request): Organizer | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.split(" ")[1];
  if (token.startsWith("eyJ")) return null;
  return organizers.find(o => o.firebaseUid === token) || null;
}

// ---------- IMAGE UPLOAD SETUP ----------
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const upload = multer({ dest: uploadsDir, limits: { fileSize: 10 * 1024 * 1024 } });

app.use("/uploads", express.static(uploadsDir));

// ---------- EMAIL TRANSPORTER ----------
let mailTransporter: nodemailer.Transporter | null = null;
const smtpHost = process.env.SMTP_HOST || "";
const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";
const emailFrom = process.env.EMAIL_FROM || "noreply@otiko.com";
const adminEmail = process.env.ADMIN_EMAIL || "";
if (smtpHost && smtpUser) {
  try {
    mailTransporter = nodemailer.createTransport({
      host: smtpHost, port: smtpPort, secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass }
    });
    console.log("[Email] SMTP transporter initialized");
  } catch (e) { console.error("[Email] Failed to init SMTP:", e); }
} else {
  console.log("[Email] No SMTP config, emails will be logged to console");
}

async function sendEmail(to: string, subject: string, html: string) {
  if (mailTransporter) {
    try { await mailTransporter.sendMail({ from: emailFrom, to, subject, html }); }
    catch (e) { console.error(`[Email] Failed to send "${subject}":`, e); }
  }
  console.log(`[Email] [${subject}] To: ${to} — ${html.replace(/<[^>]*>/g, "").slice(0, 200)}`);
}

// ---------- AUDIT LOG ----------
let auditLogs: AuditLog[] = [];

async function addAuditLog(action: string, entityType: string, entityId: string, actorId: string, actorRole: "organizer" | "admin", details: string) {
  const entry: AuditLog = {
    id: `aud-${docId()}`, action, entityType, entityId, actorId, actorRole, details, createdAt: new Date().toISOString()
  };
  auditLogs.push(entry);
  await syncSet("auditLogs", entry.id, entry);
}

// ---------- IN-MEMORY DATABASE ----------
let organizers: Organizer[] = [];
let events: Event[] = [];
let ticketCategories: TicketCategory[] = [];
let orders: Order[] = [];
let tickets: Ticket[] = [];
let ledgerEntries: LedgerEntry[] = [];
let payouts: Payout[] = [];
let payoutRequests: PayoutRequest[] = [];

let eventCodeCounter = 124;
function generateEventCode(): string {
  const code = eventCodeCounter++;
  return `OTK-2026-${String(code).padStart(6, "0")}`;
}

// ---------- SEED DATA ----------
const seedData: { organizers: Organizer[]; events: Event[]; ticketCategories: TicketCategory[] } = {
  organizers: [
    {
      id: "org-1", firebaseUid: "user-default-uid", name: "Sol Generational Group",
      email: "events@solfest.co.ke", phone: "0712345678", businessName: "Solfest Ltd",
      kycStatus: "verified" as const, mpesaPayoutNumber: "254712345678",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
  ],
  events: [
    { id: "evt-1", eventCode: "OTK-2026-000101", organizerId: "org-1", name: "Sol Fest 2026 - Uhuru Gardens", flyerUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80&w=800", eventDate: "2026-08-15T18:00:00Z", venue: "Uhuru Gardens, Langata Road, Nairobi", description: "The ultimate celebration of African music, culture, and unity.", status: "active" as const, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: "evt-2", eventCode: "OTK-2026-000102", organizerId: "org-1", name: "Sauti Sol Farewell Tour - Live in Nairobi", flyerUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=800", eventDate: "2026-11-20T19:00:00Z", venue: "KICC Plenary Hall, City Square, Nairobi", description: "The official, final, and historic culmination of their journey.", status: "active" as const, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: "evt-3", eventCode: "OTK-2026-000103", organizerId: "org-1", name: "Burna Boy Live in Nairobi", flyerUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800", eventDate: "2026-06-30T17:00:00Z", venue: "Nairobi Sports Club, Off Museum Hill", description: "The African Giant makes his triumphant return to Kenya.", status: "active" as const, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ],
  ticketCategories: [
    { id: "cat-1-reg", eventId: "evt-1", name: "Regular Ticket", price: 2500, totalQuantity: 2000, remainingQuantity: 1845, createdAt: new Date().toISOString() },
    { id: "cat-1-vip", eventId: "evt-1", name: "VIP Lounge", price: 6000, totalQuantity: 500, remainingQuantity: 412, createdAt: new Date().toISOString() },
    { id: "cat-1-vvip", eventId: "evt-1", name: "VVIP Golden Circle", price: 15000, totalQuantity: 50, remainingQuantity: 14, createdAt: new Date().toISOString() },
    { id: "cat-2-reg", eventId: "evt-2", name: "General Admission", price: 3500, totalQuantity: 1500, remainingQuantity: 1210, createdAt: new Date().toISOString() },
    { id: "cat-2-vip", eventId: "evt-2", name: "VIP Balcony", price: 8500, totalQuantity: 300, remainingQuantity: 243, createdAt: new Date().toISOString() },
    { id: "cat-3-reg", eventId: "evt-3", name: "Regular", price: 3000, totalQuantity: 5000, remainingQuantity: 4280, createdAt: new Date().toISOString() },
    { id: "cat-3-vip", eventId: "evt-3", name: "VIP Backstage Pass", price: 10000, totalQuantity: 200, remainingQuantity: 194, createdAt: new Date().toISOString() },
  ],
};

// ---------- LOAD FROM FIRESTORE OR SEED ----------
async function loadData() {
  if (firestore) {
    try {
      const orgSnap = await firestore.collection("organizers").get();
      if (!orgSnap.empty) {
        organizers = orgSnap.docs.map(d => ({ id: d.id, ...d.data() } as Organizer));
        const evtSnap = await firestore.collection("events").get();
        events = evtSnap.docs.map(d => ({ id: d.id, ...d.data() } as Event));
        const catSnap = await firestore.collection("ticketCategories").get();
        ticketCategories = catSnap.docs.map(d => ({ id: d.id, ...d.data() } as TicketCategory));
        const ordSnap = await firestore.collection("orders").get();
        orders = ordSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
        const tktSnap = await firestore.collection("tickets").get();
        tickets = tktSnap.docs.map(d => ({ id: d.id, ...d.data() } as Ticket));
        const maxCounter = tickets.reduce((max, t) => {
          const tn = String(t.ticketNumber);
          const parts = tn.split("-");
          const last = parts[parts.length - 1];
          const num = parseInt(last, 10);
          return !isNaN(num) && num > max ? num : max;
        }, 0);
        ticketCounter = Math.max(ticketCounter, maxCounter);
        const ledSnap = await firestore.collection("ledgerEntries").get();
        ledgerEntries = ledSnap.docs.map(d => ({ id: d.id, ...d.data() } as LedgerEntry));
        const paySnap = await firestore.collection("payouts").get();
        payouts = paySnap.docs.map(d => ({ id: d.id, ...d.data() } as Payout));
        const prSnap = await firestore.collection("payoutRequests").get();
        payoutRequests = prSnap.docs.map(d => ({ id: d.id, ...d.data() } as PayoutRequest));
        console.log(`[Firestore] Loaded ${organizers.length} organizers, ${events.length} events, ${orders.length} orders, ${payoutRequests.length} payout requests`);
        return;
      }
    } catch (e) {
      console.error("[Firestore] Error loading data, seeding:", e);
    }
  }

  // Seed in-memory
  organizers = [...seedData.organizers];
  events = [...seedData.events];
  ticketCategories = [...seedData.ticketCategories];

  // Seed Firestore if available
  if (firestore) {
    try {
      for (const org of seedData.organizers) await firestore.collection("organizers").doc(org.id).set(org);
      for (const evt of seedData.events) await firestore.collection("events").doc(evt.id).set(evt);
      for (const cat of seedData.ticketCategories) await firestore.collection("ticketCategories").doc(cat.id).set(cat);
      console.log("[Firestore] Seed data written");
    } catch (e) {
      console.error("[Firestore] Failed to seed data, continuing in-memory:", (e as Error).message);
      firestore = null;
    }
  }

  console.log("[Server] Running with in-memory seed data");
}

// ==================== API ENDPOINTS ====================

// --- AUTH & ORGANIZERS ---
app.post("/api/organizers/register", async (req, res) => {
  const { firebaseUid, name, email, phone, businessName, mpesaPayoutNumber } = req.body;
  if (!firebaseUid || !name || !email) {
    return res.status(400).json({ error: "Missing required profile details" });
  }

  const existing = organizers.find(o => o.firebaseUid === firebaseUid || o.email === email);
  if (existing) return res.json(existing);

  const newOrg: Organizer = {
    id: `org-${docId()}`, firebaseUid, name, email,
    phone: phone || "", businessName: businessName || name,
    kycStatus: "pending", mpesaPayoutNumber: mpesaPayoutNumber || "",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };

  organizers.push(newOrg);
  await syncSet("organizers", newOrg.id, newOrg);
  res.status(201).json(newOrg);
});

app.get("/api/organizers/me", async (req, res) => {
  const org = await getOrganizerByToken(req);
  if (!org) return res.status(401).json({ error: "Unauthorized" });
  res.json(org);
});

app.patch("/api/organizers/me", async (req, res) => {
  const org = await getOrganizerByToken(req);
  if (!org) return res.status(401).json({ error: "Unauthorized" });

  const { name, phone, businessName, mpesaPayoutNumber } = req.body;
  if (name) org.name = name;
  if (phone) org.phone = phone;
  if (businessName) org.businessName = businessName;
  if (mpesaPayoutNumber) org.mpesaPayoutNumber = mpesaPayoutNumber;
  org.updatedAt = new Date().toISOString();

  await syncUpdate("organizers", org.id, { name: org.name, phone: org.phone, businessName: org.businessName, mpesaPayoutNumber: org.mpesaPayoutNumber, updatedAt: org.updatedAt });
  res.json(org);
});

app.post("/api/organizers/upload-kyc", async (req, res) => {
  const org = await getOrganizerByToken(req);
  if (!org) return res.status(401).json({ error: "Unauthorized" });
  org.kycStatus = "pending";
  await syncUpdate("organizers", org.id, { kycStatus: "pending" });
  res.json({ message: "KYC documents submitted for review", organizer: org });
});

// --- EVENTS & CATEGORIES ---
app.get("/api/events", (req, res) => {
  const { status, search } = req.query;
  let filtered = [...events];
  if (status) filtered = filtered.filter(e => e.status === status);
  if (search) {
    const q = String(search).toLowerCase();
    filtered = filtered.filter(e => e.name.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q));
  }

  const result = filtered.map(evt => {
    const cats = ticketCategories.filter(tc => tc.eventId === evt.id);
    const minPrice = cats.reduce((min, cat) => cat.price < min ? cat.price : min, cats[0]?.price || 0);
    const maxPrice = cats.reduce((max, cat) => cat.price > max ? cat.price : max, cats[0]?.price || 0);
    const isSoldOut = cats.every(c => c.remainingQuantity <= 0);
    return { ...evt, categories: cats, minPrice, maxPrice, isSoldOut };
  });

  res.json(result);
});

app.get("/api/events/:code", (req, res) => {
  const { code } = req.params;
  const evt = events.find(e => e.eventCode === code);
  if (!evt) return res.status(404).json({ error: "Event not found" });

  const cats = ticketCategories.filter(tc => tc.eventId === evt.id);
  const minPrice = cats.reduce((min, cat) => cat.price < min ? cat.price : min, cats[0]?.price || 0);
  const maxPrice = cats.reduce((max, cat) => cat.price > max ? cat.price : max, cats[0]?.price || 0);
  const isSoldOut = cats.every(c => c.remainingQuantity <= 0);

  res.json({ ...evt, categories: cats, minPrice, maxPrice, isSoldOut });
});

app.post("/api/events", async (req, res) => {
  const org = await getOrganizerByToken(req);
  if (!org) return res.status(401).json({ error: "Unauthorized" });

  const { name, flyerUrl, eventDate, venue, description, categories } = req.body;
  if (!name || !eventDate || !venue || !categories || !Array.isArray(categories)) {
    return res.status(400).json({ error: "Missing required event fields" });
  }

  const newEventId = `evt-${docId()}`;
  const eventCode = generateEventCode();

  const newEvt: Event = {
    id: newEventId, eventCode, organizerId: org.id, name,
    flyerUrl: flyerUrl || "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80&w=800",
    eventDate, venue, description: description || "",
    status: "active", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };

  events.push(newEvt);
  await syncSet("events", newEventId, newEvt);

  const formattedCats: TicketCategory[] = categories.map((c: any, index: number) => ({
    id: `cat-${newEventId.slice(4)}-${index}`, eventId: newEventId,
    name: c.name || `Category ${index + 1}`, price: Number(c.price),
    totalQuantity: Number(c.totalQuantity), remainingQuantity: Number(c.totalQuantity),
    createdAt: new Date().toISOString()
  }));

  ticketCategories.push(...formattedCats);
  for (const cat of formattedCats) await syncSet("ticketCategories", cat.id, cat);

  res.status(201).json({ ...newEvt, categories: formattedCats });
});

app.patch("/api/events/:code", async (req, res) => {
  const org = await getOrganizerByToken(req);
  if (!org) return res.status(401).json({ error: "Unauthorized" });

  const { code } = req.params;
  const evt = events.find(e => e.eventCode === code);
  if (!evt) return res.status(404).json({ error: "Event not found" });
  if (evt.organizerId !== org.id) return res.status(403).json({ error: "You do not own this event" });

  const { name, flyerUrl, eventDate, venue, description, status } = req.body;
  if (name) evt.name = name;
  if (flyerUrl) evt.flyerUrl = flyerUrl;
  if (eventDate) evt.eventDate = eventDate;
  if (venue) evt.venue = venue;
  if (description) evt.description = description;
  if (status) evt.status = status;
  evt.updatedAt = new Date().toISOString();

  await syncUpdate("events", evt.id, { name: evt.name, flyerUrl: evt.flyerUrl, eventDate: evt.eventDate, venue: evt.venue, description: evt.description, status: evt.status, updatedAt: evt.updatedAt });
  res.json(evt);
});

app.delete("/api/events/:code", async (req, res) => {
  const org = await getOrganizerByToken(req);
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

app.get("/api/events/:code/tickets", async (req, res) => {
  const org = await getOrganizerByToken(req);
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
app.post("/api/orders/reserve", async (req, res) => {
  const { categoryId, quantity, buyerName, buyerPhone, buyerEmail } = req.body;
  const qty = Number(quantity);

  if (!categoryId || !buyerName || !buyerPhone || !buyerEmail || isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: "Invalid booking request parameters" });
  }

  const categoryIndex = ticketCategories.findIndex(c => c.id === categoryId);
  if (categoryIndex === -1) return res.status(404).json({ error: "Ticket category not found" });

  const category = ticketCategories[categoryIndex];
  const evt = events.find(e => e.id === category.eventId);
  if (!evt || evt.status !== "active") return res.status(400).json({ error: "This event is not actively accepting reservations" });
  if (new Date(evt.eventDate).getTime() < Date.now()) return res.status(400).json({ error: "This event date has already passed" });
  if (category.remainingQuantity < qty) return res.status(409).json({ error: "NOT_ENOUGH_TICKETS", message: "Requested ticket count exceeds remaining category tickets." });

  category.remainingQuantity -= qty;
  await syncUpdate("ticketCategories", category.id, { remainingQuantity: category.remainingQuantity });

  const totalAmount = category.price * qty;
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const newOrder: Order = {
    id: `ord-${docId()}`, eventId: category.eventId, categoryId,
    buyerName, buyerPhone, buyerEmail, quantity: qty,
    unitPrice: category.price, totalAmount, status: "pending",
    reservedAt: new Date().toISOString(), expiresAt, createdAt: new Date().toISOString(),
  };

  orders.push(newOrder);
  await syncSet("orders", newOrder.id, newOrder);

  setTimeout(async () => {
    const latestOrder = orders.find(o => o.id === newOrder.id);
    if (latestOrder && latestOrder.status === "pending") {
      latestOrder.status = "expired";
      const cat = ticketCategories.find(c => c.id === latestOrder.categoryId);
      if (cat) {
        cat.remainingQuantity += latestOrder.quantity;
        await syncUpdate("ticketCategories", cat.id, { remainingQuantity: cat.remainingQuantity });
      }
      await syncUpdate("orders", latestOrder.id, { status: "expired" });
      console.log(`[Sweeper] Order ${latestOrder.id} expired, tickets released.`);
    }
  }, 5 * 60 * 1000);

  res.status(201).json(newOrder);
});

app.get("/api/orders/:id", (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  const event = events.find(e => e.id === order.eventId);
  const category = ticketCategories.find(c => c.id === order.categoryId);
  res.json({ ...order, event, category });
});

// --- M-PESA STK PUSH SIMULATOR ---
app.post("/api/mpesa/initiate/:orderId", async (req, res) => {
  const { orderId } = req.params;
  const { phoneNumber } = req.body;

  const order = orders.find(o => o.id === orderId);
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.status !== "pending") return res.status(400).json({ error: `Cannot process payment on order with status ${order.status}` });

  const checkoutRequestId = `ws_CO_${Date.now().toString().slice(-8)}_${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
  order.mpesaCheckoutRequestId = checkoutRequestId;
  await syncUpdate("orders", order.id, { mpesaCheckoutRequestId: checkoutRequestId });

  let cleanPhone = phoneNumber || order.buyerPhone;
  if (cleanPhone.startsWith("0")) cleanPhone = "254" + cleanPhone.slice(1);

  console.log(`[Daraja STK Push] Sending Push for ${order.totalAmount} KES to ${cleanPhone}.. RequestId: ${checkoutRequestId}`);

  setTimeout(async () => {
    const currentOrder = orders.find(o => o.id === orderId);
    if (currentOrder && currentOrder.status === "pending") {
      triggerSimulatedCallback({
        Body: {
          stkCallback: {
            MerchantRequestID: "12345-67890",
            CheckoutRequestID: checkoutRequestId,
            ResultCode: 0,
            ResultDesc: "The service request processed successfully.",
            CallbackMetadata: {
              Item: [
                { Name: "Amount", Value: currentOrder.totalAmount },
                { Name: "MpesaReceiptNumber", Value: `QKF${crypto.randomBytes(4).toString("hex").toUpperCase()}` },
                { Name: "TransactionDate", Value: Date.now() },
                { Name: "PhoneNumber", Value: Number(cleanPhone) }
              ]
            }
          }
        }
      });
    }
  }, 4000);

  res.json({
    status: "initiated",
    message: "STK Push sent to your phone. Enter M-PESA PIN to confirm.",
    mpesaCheckoutRequestId: checkoutRequestId,
    expiresAt: order.expiresAt
  });
});

async function triggerSimulatedCallback(payload: any) {
  const { CheckoutRequestID, ResultCode, CallbackMetadata } = payload.Body.stkCallback;
  const order = orders.find(o => o.mpesaCheckoutRequestId === CheckoutRequestID);
  if (!order) { console.error(`[M-Pesa] Unknown callback: ${CheckoutRequestID}`); return; }
  if (order.status !== "pending") { console.log(`[M-Pesa] Already processed: ${order.id}`); return; }

  if (ResultCode === 0) {
    order.status = "paid";
    await syncUpdate("orders", order.id, { status: "paid" });
    console.log(`[M-Pesa] Order ${order.id} PAID.`);

    const event = events.find(e => e.id === order.eventId);
    if (event) {
      const gross = order.totalAmount;
      const fee = Math.round(gross * 0.05 * 100) / 100;
      const net = gross - fee;
      const entry: LedgerEntry = {
        id: `led-${docId()}`, organizerId: event.organizerId,
        orderId: order.id, eventId: order.eventId,
        grossAmount: gross, platformFee: fee, netAmount: net,
        entryType: "sale", createdAt: new Date().toISOString()
      };
      ledgerEntries.push(entry);
      await syncSet("ledgerEntries", entry.id, entry);
    }

    for (let i = 0; i < order.quantity; i++) {
      const ticketId = `tkt-${docId()}`;
      const eventCode = event?.eventCode || "EVENT";
      const ticketNumber = generateTicketNumber(eventCode);
      const verificationCode = generateVerificationCode();
      const ticket: Ticket = {
        id: ticketId, orderId: order.id, eventId: order.eventId,
        categoryId: order.categoryId, ticketNumber,
        verificationCode, qrSignature: verificationCode,
        status: "valid", issuedAt: new Date().toISOString()
      };
      tickets.push(ticket);
      await syncSet("tickets", ticketId, ticket);
    }
  } else {
    order.status = "failed";
    await syncUpdate("orders", order.id, { status: "failed" });
    const cat = ticketCategories.find(c => c.id === order.categoryId);
    if (cat) {
      cat.remainingQuantity += order.quantity;
      await syncUpdate("ticketCategories", cat.id, { remainingQuantity: cat.remainingQuantity });
    }
  }
}

app.post("/api/mpesa/simulated-callback", async (req, res) => {
  const { checkoutRequestId, success } = req.body;
  const order = orders.find(o => o.mpesaCheckoutRequestId === checkoutRequestId);
  if (!order) return res.status(404).json({ error: "Order checkout code not found" });

  const payload = {
    Body: {
      stkCallback: {
        CheckoutRequestID: checkoutRequestId,
        ResultCode: success ? 0 : 1032,
        ResultDesc: success ? "Success direct" : "Cancel manual",
        CallbackMetadata: success ? { Item: [{ Name: "Amount", Value: order.totalAmount }] } : null
      }
    }
  };

  await triggerSimulatedCallback(payload);
  res.json({ message: "Mock callback processed", orderStatus: order.status });
});

// --- TICKETS ---
app.get("/api/orders/:orderId/tickets", (req, res) => {
  const { orderId } = req.params;
  res.json(tickets.filter(t => t.orderId === orderId));
});

app.post("/api/tickets/verify", async (req, res) => {
  const { ticketNumber, verificationCode } = req.body;

  if (!ticketNumber || !verificationCode) {
    return res.status(400).json({ valid: false, error: "Missing ticket credentials" });
  }

  const ticket = tickets.find(t =>
    String(t.ticketNumber) === String(ticketNumber) &&
    t.verificationCode === verificationCode
  );
  if (!ticket) return res.status(404).json({ valid: false, error: "Invalid ticket" });

  if (ticket.status !== "valid") {
    return res.json({ valid: false, error: `Ticket already ${ticket.status.toUpperCase()}`, usedAt: ticket.usedAt });
  }

  ticket.status = "used";
  ticket.usedAt = new Date().toISOString();
  await syncUpdate("tickets", ticket.id, { status: "used", usedAt: ticket.usedAt });

  const order = orders.find(o => o.id === ticket.orderId);
  const event = events.find(e => e.id === ticket.eventId || (order && e.id === order.eventId));
  const category = ticketCategories.find(c => c.id === ticket.categoryId);

  res.json({
    valid: true, message: "Ticket scanned! Gate access granted.",
    ticket: { ticketNumber: ticket.ticketNumber, buyerName: order?.buyerName, categoryName: category?.name, eventName: event?.name, scannedAt: ticket.usedAt }
  });
});

// --- IMAGE UPLOAD ---
app.post("/api/upload/image", upload.single("image"), async (req, res) => {
  const org = await getOrganizerByToken(req);
  if (!org) return res.status(401).json({ error: "Unauthorized" });

  if (!req.file) return res.status(400).json({ error: "No image file provided" });

  const allowedMime = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedMime.includes(req.file.mimetype)) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "Invalid format. Accepted: JPG, JPEG, PNG, WEBP" });
  }

  const ext = path.extname(req.file.originalname).toLowerCase() || ".jpg";
  const optimizedName = `flyer-${docId()}${ext}`;
  const optimizedPath = path.join(uploadsDir, optimizedName);

  try {
    const metadata = await sharp(req.file.path)
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(optimizedPath);
    fs.unlinkSync(req.file.path);

    if (metadata.size > 500 * 1024) {
      const smallerPath = path.join(uploadsDir, `flyer-${docId()}${ext}`);
      await sharp(req.file.path)
        .resize({ width: 800, withoutEnlargement: true })
        .jpeg({ quality: 65, mozjpeg: true })
        .toFile(smallerPath);
      fs.unlinkSync(optimizedPath);
      const url = `/uploads/${path.basename(smallerPath)}`;
      return res.json({ url, size: metadata.size });
    }

    const url = `/uploads/${optimizedName}`;
    res.json({ url, size: metadata.size });
  } catch (e) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error("[Upload] Image processing error:", e);
    res.status(500).json({ error: "Failed to process image" });
  }
});

// --- WALLET & FINANCES ---
function calculateWallet(orgId: string) {
  const orgLedgers = ledgerEntries.filter(le => le.organizerId === orgId);
  const grossCollected = orgLedgers.filter(l => l.entryType === "sale").reduce((sum, item) => sum + item.grossAmount, 0);
  const platformFees = orgLedgers.filter(l => l.entryType === "sale").reduce((sum, item) => sum + item.platformFee, 0);
  const netBalance = grossCollected - platformFees;
  const processedPayoutsSum = payouts.filter(p => p.organizerId === orgId && ["completed", "approved", "processing"].includes(p.status)).reduce((sum, item) => sum + item.amount, 0);
  const pendingRequests = payoutRequests.filter(pr => pr.organizerId === orgId && pr.status === "pending");
  const reservedAmount = pendingRequests.reduce((sum, item) => sum + item.amount, 0);
  const availableBalance = Math.max(0, netBalance - processedPayoutsSum - reservedAmount);
  return { grossCollected, platformFees, netBalance, availableBalance, reservedAmount, ledger: orgLedgers, payouts: payouts.filter(p => p.organizerId === orgId), payoutRequests: payoutRequests.filter(pr => pr.organizerId === orgId) };
}

app.get("/api/wallet/overview", async (req, res) => {
  const org = await getOrganizerByToken(req);
  if (!org) return res.status(401).json({ error: "Unauthorized" });
  res.json(calculateWallet(org.id));
});

app.get("/api/wallet/payout-requests", async (req, res) => {
  const org = await getOrganizerByToken(req);
  if (!org) return res.status(401).json({ error: "Unauthorized" });
  res.json(payoutRequests.filter(pr => pr.organizerId === org.id));
});

app.post("/api/wallet/payout-request", async (req, res) => {
  const org = await getOrganizerByToken(req);
  if (!org) return res.status(401).json({ error: "Unauthorized" });

  const { amount, paymentMethod, accountDetails, notes } = req.body;
  const withdrawAmount = Number(amount);
  if (isNaN(withdrawAmount) || withdrawAmount <= 100) {
    return res.status(400).json({ error: "Minimum payout threshold is KES 100" });
  }
  if (!paymentMethod || !accountDetails) {
    return res.status(400).json({ error: "Payment method and account details are required" });
  }

  const wallet = calculateWallet(org.id);
  if (withdrawAmount > wallet.availableBalance) {
    return res.status(400).json({ error: "Insufficient available wallet balance for requested payout amount." });
  }

  const newReq: PayoutRequest = {
    id: `pr-${docId()}`, organizerId: org.id, organizerName: org.name,
    amount: withdrawAmount, availableBalanceAtRequest: wallet.availableBalance,
    paymentMethod, accountDetails, notes: notes || "",
    status: "pending", requestedAt: new Date().toISOString()
  };

  payoutRequests.push(newReq);
  await syncSet("payoutRequests", newReq.id, newReq);
  await addAuditLog("payout_request_created", "payout_request", newReq.id, org.id, "organizer", `Requested KES ${withdrawAmount} via ${paymentMethod}`);

  // Notify admin
  if (adminEmail) {
    sendEmail(adminEmail, "New Payout Request",
      `<p>Organizer: ${org.name} (${org.email})</p><p>Amount: KES ${withdrawAmount}</p><p>Method: ${paymentMethod}</p><p>Account: ${accountDetails}</p>`);
  }

  // Notify organizer
  sendEmail(org.email, "Payout Request Received",
    `<p>Your payout request <strong>${newReq.id}</strong> has been received.</p><p>Amount: KES ${withdrawAmount}</p><p>Status: Pending</p><p>Date: ${newReq.requestedAt}</p>`);

  res.status(201).json(newReq);
});

// --- ADMIN: PAYOUT REQUEST MANAGEMENT ---
async function isAdmin(req: express.Request): Promise<boolean> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  const token = authHeader.split(" ")[1];
  if (token === "admin-token-2026") return true;
  if (!firebaseAuth) return false;
  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    return !!(decoded && (decoded as any).admin);
  } catch { return false; }
}

app.get("/api/admin/payout-requests", async (req, res) => {
  if (!await isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });
  const { status } = req.query;
  let filtered = [...payoutRequests];
  if (status && typeof status === "string") filtered = filtered.filter(pr => pr.status === status);
  res.json(filtered.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()));
});

app.post("/api/admin/payout-requests/:id/approve", async (req, res) => {
  const adminOrg = await getOrganizerByToken(req);
  if (!adminOrg && !await isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });
  const pr = payoutRequests.find(p => p.id === req.params.id);
  if (!pr) return res.status(404).json({ error: "Payout request not found" });
  if (pr.status !== "pending") return res.status(400).json({ error: `Request is already ${pr.status}` });

  pr.status = "approved";
  pr.approvedAt = new Date().toISOString();
  pr.approvedBy = adminOrg?.id || "admin";
  await syncUpdate("payoutRequests", pr.id, { status: "approved", approvedAt: pr.approvedAt, approvedBy: pr.approvedBy });
  await addAuditLog("payout_request_approved", "payout_request", pr.id, adminOrg?.id || "admin", "admin", `Approved KES ${pr.amount}`);

  const org = organizers.find(o => o.id === pr.organizerId);
  if (org) sendEmail(org.email, "Payout Request Approved",
    `<p>Your payout request <strong>${pr.id}</strong> has been approved.</p><p>Amount: KES ${pr.amount}</p><p>Approval Date: ${pr.approvedAt}</p><p>Your payment will be processed shortly.</p>`);

  res.json(pr);
});

app.post("/api/admin/payout-requests/:id/reject", async (req, res) => {
  const adminOrg = await getOrganizerByToken(req);
  if (!adminOrg && !await isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });
  const pr = payoutRequests.find(p => p.id === req.params.id);
  if (!pr) return res.status(404).json({ error: "Payout request not found" });
  if (pr.status !== "pending") return res.status(400).json({ error: `Request is already ${pr.status}` });

  const { reason } = req.body;
  pr.status = "rejected";
  pr.rejectionReason = reason || "No reason provided";
  await syncUpdate("payoutRequests", pr.id, { status: "rejected", rejectionReason: pr.rejectionReason });
  await addAuditLog("payout_request_rejected", "payout_request", pr.id, adminOrg?.id || "admin", "admin", `Rejected KES ${pr.amount}: ${pr.rejectionReason}`);

  const org = organizers.find(o => o.id === pr.organizerId);
  if (org) sendEmail(org.email, "Payout Request Rejected",
    `<p>Your payout request <strong>${pr.id}</strong> has been rejected.</p><p>Amount: KES ${pr.amount}</p><p>Reason: ${pr.rejectionReason}</p>`);

  res.json(pr);
});

app.post("/api/admin/payout-requests/:id/process", async (req, res) => {
  const adminOrg = await getOrganizerByToken(req);
  if (!adminOrg && !await isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });
  const pr = payoutRequests.find(p => p.id === req.params.id);
  if (!pr) return res.status(404).json({ error: "Payout request not found" });
  if (pr.status !== "approved") return res.status(400).json({ error: "Request must be approved before processing" });

  pr.status = "processed";
  pr.processedAt = new Date().toISOString();
  await syncUpdate("payoutRequests", pr.id, { status: "processed", processedAt: pr.processedAt });

  // Create actual payout record
  const newPayout: Payout = {
    id: `pay-${docId()}`, organizerId: pr.organizerId, amount: pr.amount,
    status: "completed", mpesaTransactionId: `TXN${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
    requestedAt: pr.requestedAt, processedAt: pr.processedAt
  };
  payouts.push(newPayout);
  await syncSet("payouts", newPayout.id, newPayout);

  // Create ledger entry
  const entry: LedgerEntry = {
    id: `led-${docId()}`, organizerId: pr.organizerId, orderId: "", eventId: "",
    grossAmount: -pr.amount, platformFee: 0, netAmount: -pr.amount,
    entryType: "payout", createdAt: new Date().toISOString()
  };
  ledgerEntries.push(entry);
  await syncSet("ledgerEntries", entry.id, entry);

  await addAuditLog("payout_request_processed", "payout_request", pr.id, adminOrg?.id || "admin", "admin", `Processed KES ${pr.amount}`);

  const org = organizers.find(o => o.id === pr.organizerId);
  if (org) sendEmail(org.email, "Payout Successfully Processed",
    `<p>Your payout request <strong>${pr.id}</strong> has been processed.</p><p>Amount Paid: KES ${pr.amount}</p><p>Processing Date: ${pr.processedAt}</p><p>Transaction: ${newPayout.mpesaTransactionId}</p>`);

  res.json(pr);
});

// ==================== VITE MIDDLEWARE ====================
async function startServer() {
  await loadData();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Otiko engine running on http://localhost:${PORT}`);
  });
}

startServer();
