import express from "express";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import multer from "multer";
import sharp from "sharp";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import nodemailer from "nodemailer";
import { createServer as createViteServer } from "vite";
import { initializeApp as initFirebase, cert } from "firebase-admin";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { z } from "zod";
import { Event, TicketCategory, Order, Ticket, LedgerEntry, Payout, PayoutRequest, AuditLog, Organizer } from "./src/types";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

const CORS_ORIGINS = [
  "https://otiko.com",
  "https://www.otiko.com",
  "https://otiko-9e7a9.web.app",
  "https://otiko-9e7a9.firebaseapp.com",
  "http://localhost:5173",
  "http://localhost:3000",
];
app.use(cors({ origin: CORS_ORIGINS, credentials: true }));

// ---------- RATE LIMITERS ----------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  standardHeaders: true, legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 30,
  standardHeaders: true, legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 100,
  standardHeaders: true, legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

// ---------- VALIDATION MIDDLEWARE ----------
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function validate(schema: z.ZodType) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const first = result.error.issues[0];
      return res.status(400).json({ error: first?.message || "Invalid request body" });
    }
    req.body = result.data;
    next();
  };
}

const schemas = {
  registerOrganizer: z.object({
    firebaseUid: z.string().min(1, "firebaseUid is required"),
    name: z.string().min(1, "name is required"),
    email: z.string().email("Invalid email"),
    phone: z.string().optional().default(""),
    businessName: z.string().optional().default(""),
    mpesaPayoutNumber: z.string().optional().default(""),
  }),

  updateOrganizer: z.object({
    name: z.string().min(1).optional(),
    phone: z.string().optional(),
    businessName: z.string().optional(),
    mpesaPayoutNumber: z.string().optional(),
  }),

  uploadKyc: z.object({
    kraPin: z.string().optional().default(""),
  }),

  eventCategory: z.object({
    name: z.string().min(1, "Category name is required"),
    price: z.number().positive("Price must be positive"),
    totalQuantity: z.number().int().positive("Quantity must be positive"),
  }),

  createEvent: z.object({
    name: z.string().min(1, "Event name is required"),
    flyerUrl: z.string().optional(),
    eventDate: z.string().min(1, "Event date is required"),
    venue: z.string().min(1, "Venue is required"),
    description: z.string().optional().default(""),
    categories: z.array(z.object({
      name: z.string().min(1),
      price: z.number().positive(),
      totalQuantity: z.number().int().positive(),
    })).min(1, "At least one category is required"),
  }),

  updateEvent: z.object({
    name: z.string().min(1).optional(),
    flyerUrl: z.string().optional(),
    eventDate: z.string().min(1).optional(),
    venue: z.string().min(1).optional(),
    description: z.string().optional(),
    status: z.enum(["active", "cancelled", "completed"]).optional(),
  }),

  reserveOrder: z.object({
    categoryId: z.string().min(1, "categoryId is required"),
    quantity: z.number().int().positive("quantity must be a positive integer"),
    buyerName: z.string().min(1, "Buyer name is required"),
    buyerPhone: z.string().min(1, "Buyer phone is required"),
    buyerEmail: z.string().email("Invalid buyer email"),
  }),

  mpesaInitiate: z.object({
    phoneNumber: z.string().optional(),
  }),

  simulatedCallback: z.object({
    checkoutRequestId: z.string().min(1, "checkoutRequestId is required"),
    success: z.boolean().optional(),
  }),

  verifyTicket: z.object({
    ticketNumber: z.string().min(1, "ticketNumber is required"),
    verificationCode: z.string().min(1, "verificationCode is required"),
  }),

  payoutRequest: z.object({
    amount: z.number().min(101, "Minimum payout threshold is KES 100"),
    paymentMethod: z.enum(["mpesa", "bank"]),
    notes: z.string().optional(),
    phoneNumber: z.string().optional(),
    bankAccountHolder: z.string().optional(),
    bankAccountNumber: z.string().optional(),
    bankName: z.string().optional(),
    bankBranchName: z.string().optional(),
  }),

  adminUpdateOrganizer: z.object({
    kycStatus: z.string().optional(),
    role: z.string().optional(),
  }),

  adminUpdateEvent: z.object({
    status: z.string().min(1).optional(),
  }),

  adminRejectPayout: z.object({
    reason: z.string().optional().default("No reason provided"),
  }),

  adminProcessPayout: z.object({
    confirmationCode: z.string().min(3, "Confirmation code must be at least 3 characters"),
  }),
};

const TICKET_SECRET = process.env.TICKET_SECRET;

function generateTicketNumber(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code: string;
  let attempts = 0;
  do {
    code = "OTK-";
    for (let i = 0; i < 6; i++) {
      code += chars[crypto.randomInt(0, chars.length)];
    }
    attempts++;
  } while (tickets.some(t => t.ticketNumber === code) && attempts < 20);
  return code;
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
      return null;
    }
  }

  // DEMO MODE: direct UID matching — only enabled when ALLOW_DEMO_AUTH=true
  if (process.env.ALLOW_DEMO_AUTH === "true" && !token.startsWith("eyJ")) {
    return organizers.find(o => o.firebaseUid === token) || null;
  }

  return null;
}

// Sync version for endpoints that don't need async
function getOrganizerByTokenSync(req: express.Request): Organizer | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.split(" ")[1];
  // DEMO MODE: direct UID matching — only enabled when ALLOW_DEMO_AUTH=true
  if (process.env.ALLOW_DEMO_AUTH === "true" && !token.startsWith("eyJ")) {
    return organizers.find(o => o.firebaseUid === token) || null;
  }
  return null;
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
let inMemoryLocks = new Map<string, number>();

let eventCodeCounter = 124;
function generateEventCode(): string {
  const code = eventCodeCounter++;
  return `OTK-2026-${String(code).padStart(6, "0")}`;
}

// ---------- SEED DATA ----------
// ---------- LOAD FROM FIRESTORE ----------
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
      console.error("[Firestore] Error loading data:", e);
    }
  }

  console.log("[Server] No seed data — awaiting organizer-created events");
}

// ==================== API ENDPOINTS ====================

// --- AUTH & ORGANIZERS ---
app.post("/api/organizers/register", authLimiter, validate(schemas.registerOrganizer), async (req, res) => {
  const { firebaseUid, name, email, phone, businessName, mpesaPayoutNumber } = req.body;


  const existing = organizers.find(o => o.firebaseUid === firebaseUid || o.email === email);
  if (existing) return res.json(existing);

  const isAdminUser = email === process.env.ADMIN_EMAIL;
  const newOrg: Organizer = {
    id: `org-${docId()}`, firebaseUid, name, email,
    phone: phone || "", businessName: businessName || name,
    kycStatus: "pending", mpesaPayoutNumber: mpesaPayoutNumber || "",
    role: isAdminUser ? "admin" : "organizer",
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

app.patch("/api/organizers/me", validate(schemas.updateOrganizer), async (req, res) => {
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

app.post("/api/organizers/upload-kyc", upload.single("kycDocument"), validate(schemas.uploadKyc), async (req, res) => {
  const org = await getOrganizerByToken(req);
  if (!org) return res.status(401).json({ error: "Unauthorized" });

  const kraPin = req.body.kraPin || "";
  let kycDocUrl = org.kycDocUrl || "";

  if (req.file) {
    if (req.file.mimetype !== "application/pdf") {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: "Only PDF files are accepted" });
    }
    if (req.file.size > 500 * 1024) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: "File exceeds 500KB limit" });
    }
    // Compress PDF using pdf-lib (best-effort to reduce size)
    try {
      const originalBytes = fs.readFileSync(req.file.path);
      let pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
      let compressedBytes = await pdfDoc.save({ useObjectStreams: true });
      // If still too large, try stripping metadata by copying pages to a fresh document
      if (compressedBytes.length > 500 * 1024) {
        const freshDoc = await PDFDocument.create();
        const copied = await freshDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copied.forEach(p => freshDoc.addPage(p));
        compressedBytes = await freshDoc.save({ useObjectStreams: true });
      }
      if (compressedBytes.length < originalBytes.length) {
        fs.writeFileSync(req.file.path, compressedBytes);
      }
    } catch (pdfErr) {
      console.warn("[KYC] PDF compression skipped:", (pdfErr as Error).message);
    }
    kycDocUrl = `/uploads/${req.file.filename}`;
  }

  org.kycStatus = "pending";
  org.kraPin = kraPin;
  org.kycDocUrl = kycDocUrl;
  await syncUpdate("organizers", org.id, { kycStatus: "pending", kraPin, kycDocUrl });
  res.json({ message: "KYC documents submitted for review", organizer: org });
});

// --- EVENTS & CATEGORIES ---
app.get("/api/events", publicLimiter, async (req, res) => {
  const { status, search } = req.query;
  let filtered = [...events];

  // If authenticated, filter events to only this organizer's events
  const org = await getOrganizerByToken(req);
  if (org) {
    filtered = filtered.filter(e => e.organizerId === org.id);
  }

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

app.get("/api/events/:code", publicLimiter, (req, res) => {
  const { code } = req.params;
  const evt = events.find(e => e.eventCode === code);
  if (!evt) return res.status(404).json({ error: "Event not found" });

  const cats = ticketCategories.filter(tc => tc.eventId === evt.id);
  const minPrice = cats.reduce((min, cat) => cat.price < min ? cat.price : min, cats[0]?.price || 0);
  const maxPrice = cats.reduce((max, cat) => cat.price > max ? cat.price : max, cats[0]?.price || 0);
  const isSoldOut = cats.every(c => c.remainingQuantity <= 0);

  res.json({ ...evt, categories: cats, minPrice, maxPrice, isSoldOut });
});

app.post("/api/events", apiLimiter, validate(schemas.createEvent), async (req, res) => {
  const org = await getOrganizerByToken(req);
  if (!org) return res.status(401).json({ error: "Unauthorized" });

  const { name, flyerUrl, eventDate, venue, description, categories } = req.body;

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

app.patch("/api/events/:code", validate(schemas.updateEvent), async (req, res) => {
  const org = await getOrganizerByToken(req);
  if (!org) return res.status(401).json({ error: "Unauthorized" });

  const { code } = req.params;
  const evt = events.find(e => e.eventCode === code);
  if (!evt) return res.status(404).json({ error: "Event not found" });
  if (evt.organizerId !== org.id) return res.status(403).json({ error: "You do not own this event" });

  try {
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
  } catch (err) {
    console.error("Failed to update event:", err);
    res.status(500).json({ error: "Failed to update event" });
  }
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
app.post("/api/orders/reserve", apiLimiter, validate(schemas.reserveOrder), async (req, res) => {
  const { categoryId, quantity: qty, buyerName, buyerPhone, buyerEmail } = req.body;

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
app.post("/api/mpesa/initiate/:orderId", validate(schemas.mpesaInitiate), async (req, res) => {
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
      const ticketNumber = generateTicketNumber();
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

app.post("/api/mpesa/simulated-callback", validate(schemas.simulatedCallback), async (req, res) => {
  if (!await isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });
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

app.post("/api/tickets/verify", validate(schemas.verifyTicket), async (req, res) => {
  const { ticketNumber, verificationCode } = req.body;

  const ticket = tickets.find(t =>
    String(t.ticketNumber) === String(ticketNumber) &&
    t.verificationCode === verificationCode
  );
  if (!ticket) return res.status(404).json({ valid: false, error: "Invalid ticket" });

  // Verify the ticket's event belongs to the authenticated organizer
  const org = await getOrganizerByToken(req);
  if (org) {
    const evt = events.find(e => e.id === ticket.eventId);
    if (!evt || evt.organizerId !== org.id) {
      return res.status(403).json({ valid: false, error: "This ticket does not belong to your event" });
    }
  }

  if (ticket.status !== "valid") {
    return res.json({ valid: false, error: `Ticket already ${ticket.status.toUpperCase()}`, usedAt: ticket.usedAt });
  }

  try {
    ticket.status = "used";
    ticket.usedAt = new Date().toISOString();
    await syncUpdate("tickets", ticket.id, { status: "used", usedAt: ticket.usedAt });
  } catch (err) {
    console.error("Failed to verify ticket:", err);
    return res.status(500).json({ valid: false, error: "Failed to verify ticket" });
  }

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

function validateKenyanPhone(phone: string): boolean {
  return /^(254|0)?[17]\d{8}$/.test(phone.replace(/\s+/g, ""));
}

app.post("/api/wallet/payout-request", authLimiter, validate(schemas.payoutRequest), async (req, res) => {
  const org = await getOrganizerByToken(req);
  if (!org) return res.status(401).json({ error: "Unauthorized" });
  if (org.kycStatus !== "verified") {
    return res.status(403).json({ error: "Payout not allowed: Organizer is not verified" });
  }

  const { amount, paymentMethod, notes } = req.body;
  const withdrawAmount = amount;

  let accountDetails = "";
  if (paymentMethod === "mpesa") {
    const phoneNumber = req.body.phoneNumber || "";
    if (!validateKenyanPhone(phoneNumber)) {
      return res.status(400).json({ error: "Valid Kenyan M-Pesa phone number required (e.g. 254712345678)" });
    }
    accountDetails = JSON.stringify({ phoneNumber });
  } else if (paymentMethod === "bank") {
    const { bankAccountHolder, bankAccountNumber, bankName, bankBranchName } = req.body;
    if (!bankAccountHolder || !bankAccountNumber || !bankName || !bankBranchName) {
      return res.status(400).json({ error: "All bank transfer fields are required: account holder, account number, bank name, and branch name" });
    }
    accountDetails = JSON.stringify({ bankAccountHolder, bankAccountNumber, bankName, bankBranchName });
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
      `<p>Organizer: ${esc(org.name)} (${esc(org.email)})</p><p>Amount: KES ${withdrawAmount}</p><p>Method: ${esc(paymentMethod)}</p><p>Account: ${esc(accountDetails)}</p>`);
  }

  // Notify organizer
  sendEmail(org.email, "Payout Request Received",
    `<p>Your payout request <strong>${esc(newReq.id)}</strong> has been received.</p><p>Amount: KES ${withdrawAmount}</p><p>Status: Pending</p><p>Date: ${esc(newReq.requestedAt)}</p>`);

  res.status(201).json(newReq);
});

// --- ADMIN: ORGANIZER MANAGEMENT ---
app.get("/api/admin/organizers", async (req, res) => {
  if (!await isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });
  res.json(organizers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

app.patch("/api/admin/organizers/:id", validate(schemas.adminUpdateOrganizer), async (req, res) => {
  if (!await isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });
  const org = organizers.find(o => o.id === req.params.id);
  if (!org) return res.status(404).json({ error: "Organizer not found" });
  const { kycStatus, role } = req.body;
  if (kycStatus) org.kycStatus = kycStatus;
  if (role) org.role = role;
  org.updatedAt = new Date().toISOString();
  await syncUpdate("organizers", org.id, { kycStatus: org.kycStatus, role: org.role, updatedAt: org.updatedAt });
  await addAuditLog("organizer_updated", "organizer", org.id, "admin", "admin", `Updated ${org.name}: KYC=${org.kycStatus}, Role=${org.role}`);
  res.json(org);
});

app.delete("/api/admin/organizers/:id", async (req, res) => {
  if (!await isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });
  const idx = organizers.findIndex(o => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Organizer not found" });
  const removed = organizers.splice(idx, 1)[0];
  await syncDelete("organizers", removed.id);
  await addAuditLog("organizer_deleted", "organizer", removed.id, "admin", "admin", `Deleted organizer ${removed.name} (${removed.email})`);
  res.json({ success: true });
});

// --- ORGANIZER DELETE ACCOUNT SELF-SERVICE ---
app.post("/api/organizers/delete-account", async (req, res) => {
  const org = await getOrganizerByToken(req);
  if (!org) return res.status(401).json({ error: "Unauthorized" });

  // Check if the organizer has any paid orders (sold tickets)
  const soldTickets = tickets.filter(t => {
    const order = orders.find(o => o.id === t.orderId && o.status === "paid");
    const event = events.find(e => e.id === t.eventId && e.organizerId === org.id);
    return order && event;
  });

  const hasSales = soldTickets.length > 0;
  const organizerEvents = events.filter(e => e.organizerId === org.id);
  const hasActiveEvents = organizerEvents.some(e => e.status === "active");

  if (hasSales) {
    // Deactivation path: tickets exist, must keep records
    const now = new Date().toISOString();

    // Cancel all active events (hide from public)
    for (const evt of organizerEvents) {
      if (evt.status === "active" || evt.status === "draft") {
        evt.status = "cancelled";
        await syncUpdate("events", evt.id, { status: "cancelled" });
      }
    }

    // Anonymize organizer profile so it's no longer accessible
    org.email = `deleted-${org.id}@otiko.local`;
    org.phone = "";
    org.businessName = "Deactivated Account";
    org.name = "Deactivated Account";
    org.kycStatus = "rejected";
    org.updatedAt = now;
    await syncUpdate("organizers", org.id, {
      email: org.email, phone: org.phone, businessName: org.businessName,
      name: org.name, kycStatus: org.kycStatus, updatedAt: now,
    });

    await addAuditLog("account_deactivated", "organizer", org.id, org.id, "organizer",
      `Account deactivated (tickets sold): ${organizerEvents.length} events cancelled, ${soldTickets.length} ticket records retained`);

    // Clear auth token by removing firebaseUid mapping (prevents login)
    org.firebaseUid = `deactivated-${org.id}`;
    await syncUpdate("organizers", org.id, { firebaseUid: org.firebaseUid });

    return res.json({ deactivated: true, reason: "tickets_exist", message: "Account deactivated. Your events have been cancelled. Ticket records are retained for customer reference." });
  }

  // Full deletion path: no tickets sold
  const orgId = org.id;

  // Delete all organizer events
  for (const evt of organizerEvents) {
    const evtIdx = events.findIndex(e => e.id === evt.id);
    if (evtIdx !== -1) events.splice(evtIdx, 1);
    await syncDelete("events", evt.id);
  }

  // Delete all tickets belonging to this organizer's events
  const eventIds = new Set(organizerEvents.map(e => e.id));
  for (let i = tickets.length - 1; i >= 0; i--) {
    if (eventIds.has(tickets[i].eventId)) {
      const removed = tickets.splice(i, 1)[0];
      await syncDelete("tickets", removed.id);
    }
  }

  // Delete all orders for this organizer's events
  for (let i = orders.length - 1; i >= 0; i--) {
    if (eventIds.has(orders[i].eventId)) {
      const removed = orders.splice(i, 1)[0];
      await syncDelete("orders", removed.id);
    }
  }

  // Delete payout requests
  for (let i = payoutRequests.length - 1; i >= 0; i--) {
    if (payoutRequests[i].organizerId === orgId) {
      const removed = payoutRequests.splice(i, 1)[0];
      await syncDelete("payout_requests", removed.id);
    }
  }

  // Delete ledger entries
  for (let i = ledgerEntries.length - 1; i >= 0; i--) {
    if (ledgerEntries[i].organizerId === orgId) {
      const removed = ledgerEntries.splice(i, 1)[0];
      await syncDelete("ledgerEntries", removed.id);
    }
  }

  // Delete the organizer
  const orgIdx = organizers.findIndex(o => o.id === orgId);
  if (orgIdx !== -1) {
    organizers.splice(orgIdx, 1);
    await syncDelete("organizers", orgId);
  }

  // Clean up uploaded images
  for (const evt of organizerEvents) {
    if (evt.flyerUrl && evt.flyerUrl.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), evt.flyerUrl);
      try { fs.unlinkSync(filePath); } catch { /* ignore */ }
    }
  }

  // Clean up KYC documents
  if (org.kycDocUrl && org.kycDocUrl.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), org.kycDocUrl);
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }
  }

  await addAuditLog("account_deleted", "organizer", orgId, orgId, "organizer",
    `Account permanently deleted: ${organizerEvents.length} events, ${hasActiveEvents ? "had active events" : "no active events"}`);

  res.json({ deleted: true, message: "Account permanently deleted." });
});

// --- ADMIN: EVENT MANAGEMENT ---
app.get("/api/admin/events", async (req, res) => {
  if (!await isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });
  res.json(events.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()));
});

app.patch("/api/admin/events/:id", validate(schemas.adminUpdateEvent), async (req, res) => {
  if (!await isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });
  const evt = events.find(e => e.id === req.params.id);
  if (!evt) return res.status(404).json({ error: "Event not found" });
  const { status } = req.body;
  if (status) evt.status = status;
  await syncUpdate("events", evt.id, { status: evt.status });
  await addAuditLog("event_updated", "event", evt.id, "admin", "admin", `Updated event ${evt.name}: status=${evt.status}`);
  res.json(evt);
});

app.delete("/api/admin/events/:id", async (req, res) => {
  if (!await isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });
  const idx = events.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Event not found" });
  const removed = events.splice(idx, 1)[0];
  await syncDelete("events", removed.id);
  await addAuditLog("event_deleted", "event", removed.id, "admin", "admin", `Deleted event ${removed.name}`);
  res.json({ success: true });
});

// --- ADMIN: TICKET MANAGEMENT ---
app.get("/api/admin/tickets", async (req, res) => {
  if (!await isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });
  res.json(tickets.sort((a, b) => new Date(b.issuedAt || b.id).getTime() - new Date(a.issuedAt || a.id).getTime()));
});

app.delete("/api/admin/tickets/:id", async (req, res) => {
  if (!await isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });

  const ticket = tickets.find(t => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  const idx = tickets.indexOf(ticket);
  tickets.splice(idx, 1);
  await syncDelete("tickets", ticket.id);

  await addAuditLog("ticket_deleted", "ticket", ticket.id, "admin", "admin",
    `Deleted ticket ${ticket.ticketNumber} for event ${ticket.eventId}`);

  res.json({ success: true, message: `Ticket ${ticket.ticketNumber} deleted.` });
});

// --- ADMIN: AUDIT LOGS ---
app.get("/api/admin/audit-logs", async (req, res) => {
  if (!await isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });
  res.json(auditLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

// --- ADMIN: PAYOUT REQUEST MANAGEMENT ---
async function isAdmin(req: express.Request): Promise<boolean> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  const token = authHeader.split(" ")[1];
  if (!firebaseAuth) return false;
  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    const org = organizers.find(o => o.firebaseUid === decoded.uid);
    return !!(org && org.role === "admin");
  } catch { return false; }
}

app.get("/api/admin/payout-requests", async (req, res) => {
  if (!await isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });
  const { status } = req.query;
  let filtered = [...payoutRequests];
  if (status && typeof status === "string") filtered = filtered.filter(pr => pr.status === status);
  // Attach organizer KYC status to each request
  const enriched = filtered.map(pr => {
    const org = organizers.find(o => o.id === pr.organizerId);
    return { ...pr, organizerKycStatus: org?.kycStatus || "unknown" };
  });
  // Compute platform-level balance
  const allLedgers = ledgerEntries.filter(l => l.entryType === "sale");
  const grossCollected = allLedgers.reduce((s, item) => s + item.grossAmount, 0);
  const platformFees = allLedgers.reduce((s, item) => s + item.platformFee, 0);
  const netBalance = grossCollected - platformFees;
  const processedPayoutsSum = payouts
    .filter(p => ["completed", "approved", "processing"].includes(p.status))
    .reduce((sum, item) => sum + item.amount, 0);
  const reservedAmount = payoutRequests
    .filter(pr => pr.status === "pending" || pr.status === "approved")
    .reduce((sum, item) => sum + item.amount, 0);
  const availableBalance = Math.max(0, netBalance - processedPayoutsSum - reservedAmount);

  res.json({
    requests: enriched.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()),
    platformBalance: { grossCollected, platformFees, netBalance, processedPayoutsSum, reservedAmount, availableBalance }
  });
});

app.post("/api/admin/payout-requests/:id/approve", async (req, res) => {
  if (!await isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });
  const pr = payoutRequests.find(p => p.id === req.params.id);
  if (!pr) return res.status(404).json({ error: "Payout request not found" });
  if (pr.status !== "pending") return res.status(400).json({ error: `Request is already ${pr.status}` });

  // KYC check
  const org = organizers.find(o => o.id === pr.organizerId);
  if (!org || org.kycStatus !== "verified") {
    await addAuditLog("PAYOUT_BLOCKED_UNVERIFIED_ACCOUNT", "payout_request", pr.id, "admin", "admin",
      `Blocked: Organizer ${pr.organizerName} (${pr.organizerId}) is not verified. Amount: KES ${pr.amount}`);
    return res.status(403).json({ error: "Payout not allowed: Organizer is not verified" });
  }

  // Balance re-check
  const wallet = calculateWallet(pr.organizerId);
  if (pr.amount > wallet.availableBalance) {
    return res.status(400).json({ error: "Insufficient platform balance to approve this payout" });
  }

  pr.status = "approved";
  pr.approvedAt = new Date().toISOString();
  pr.approvedBy = "admin";
  await syncUpdate("payoutRequests", pr.id, { status: "approved", approvedAt: pr.approvedAt, approvedBy: pr.approvedBy });
  await addAuditLog("payout_request_approved", "payout_request", pr.id, "admin", "admin", `Approved KES ${pr.amount} for ${pr.organizerName}`);

  if (org) sendEmail(org.email, "Payout Request Approved",
    `<p>Your payout request <strong>${pr.id}</strong> has been approved.</p><p>Amount: KES ${pr.amount}</p><p>Approval Date: ${pr.approvedAt}</p><p>Your payment will be processed shortly.</p>`);

  res.json(pr);
});

app.post("/api/admin/payout-requests/:id/reject", validate(schemas.adminRejectPayout), async (req, res) => {
  if (!await isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });
  const pr = payoutRequests.find(p => p.id === req.params.id);
  if (!pr) return res.status(404).json({ error: "Payout request not found" });
  if (pr.status !== "pending") return res.status(400).json({ error: `Request is already ${pr.status}` });

  const { reason } = req.body;
  pr.status = "rejected";
  pr.rejectionReason = reason || "No reason provided";
  await syncUpdate("payoutRequests", pr.id, { status: "rejected", rejectionReason: pr.rejectionReason });
  await addAuditLog("payout_request_rejected", "payout_request", pr.id, "admin", "admin", `Rejected KES ${pr.amount}: ${pr.rejectionReason}`);

  const org = organizers.find(o => o.id === pr.organizerId);
  if (org) sendEmail(org.email, "Payout Request Rejected",
    `<p>Your payout request <strong>${pr.id}</strong> has been rejected.</p><p>Amount: KES ${pr.amount}</p><p>Reason: ${pr.rejectionReason}</p>`);

  res.json(pr);
});

app.post("/api/admin/payout-requests/:id/process", validate(schemas.adminProcessPayout), async (req, res) => {
  const adminOrg = await getOrganizerByToken(req);
  if (!adminOrg || adminOrg.role !== "admin") return res.status(401).json({ error: "Unauthorized" });
  const pr = payoutRequests.find(p => p.id === req.params.id);
  if (!pr) return res.status(404).json({ error: "Payout request not found" });
  if (pr.status !== "approved") return res.status(400).json({ error: "Request must be approved before processing" });

  const { confirmationCode } = req.body;

  // KYC check (defensive — should have passed at approval)
  const org = organizers.find(o => o.id === pr.organizerId);
  if (!org || org.kycStatus !== "verified") {
    await addAuditLog("PAYOUT_BLOCKED_UNVERIFIED_ACCOUNT", "payout_request", pr.id, adminOrg.id, "admin",
      `Blocked at process: Organizer ${pr.organizerName} (${pr.organizerId}) not verified. Amount: KES ${pr.amount}`);
    return res.status(403).json({ error: "Payout not allowed: Organizer is not verified" });
  }

  // Balance re-check
  const wallet = calculateWallet(pr.organizerId);
  if (pr.amount > wallet.availableBalance) {
    return res.status(400).json({ error: "Insufficient platform balance to process this payout" });
  }

  // Lock: prevent double processing
  const lockKey = `payout-lock-${pr.id}`;
  if ((inMemoryLocks?.has(lockKey))) {
    return res.status(409).json({ error: "This payout is being processed by another admin" });
  }
  if (!inMemoryLocks) inMemoryLocks = new Map();
  inMemoryLocks.set(lockKey, Date.now());

  try {
    pr.status = "processed";
    pr.processedAt = new Date().toISOString();
    pr.processedBy = adminOrg.id;
    pr.processedByName = adminOrg.name;
    pr.confirmationCode = confirmationCode.trim();
    await syncUpdate("payoutRequests", pr.id, {
      status: "processed", processedAt: pr.processedAt,
      processedBy: pr.processedBy, processedByName: pr.processedByName,
      confirmationCode: pr.confirmationCode
    });

    // Create actual payout record with full metadata
    const newPayout: Payout = {
      id: `pay-${docId()}`, organizerId: pr.organizerId, amount: pr.amount,
      status: "completed", mpesaTransactionId: `TXN${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
      requestedAt: pr.requestedAt, processedAt: pr.processedAt,
      payoutRequestId: pr.id, processedBy: pr.processedBy,
      processedByName: pr.processedByName, confirmationCode: pr.confirmationCode,
      paymentMethod: pr.paymentMethod,
      recipientName: pr.organizerName, recipientId: pr.organizerId
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

    await addAuditLog("payout_request_processed", "payout_request", pr.id, adminOrg.id, "admin",
      `Processed KES ${pr.amount} for ${pr.organizerName} via ${pr.paymentMethod}. Code: ${pr.confirmationCode}. Admin: ${adminOrg.name}`);

    if (org) sendEmail(org.email, "Payout Successfully Processed",
      `<p>Your payout request <strong>${pr.id}</strong> has been processed.</p>
       <p>Amount Paid: KES ${pr.amount}</p>
       <p>Processing Date: ${pr.processedAt}</p>
       <p>Processed By: ${adminOrg.name}</p>
       <p>Transaction: ${newPayout.mpesaTransactionId}</p>
       <p>Confirmation Code: ${pr.confirmationCode}</p>`);

    res.json(pr);
  } finally {
    inMemoryLocks.delete(lockKey);
  }
});

// --- PAYOUT RECEIPT PDF ---
app.get("/api/admin/payout-receipt/:id", async (req, res) => {
  if (!await isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });
  const payout = payouts.find(p => p.payoutRequestId === req.params.id || p.id === req.params.id);
  const pr = payoutRequests.find(p => p.id === (payout?.payoutRequestId || req.params.id));
  if (!pr && !payout) return res.status(404).json({ error: "Payout not found" });

  const receipt = pr || payout;
  const org = organizers.find(o => o.id === (pr?.organizerId || payout?.organizerId));

  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();

    // Font setup
    const helvetica = await pdfDoc.embedStandardFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedStandardFont(StandardFonts.HelveticaBold);

    let y = height - 50;

    // Header
    page.drawText("PAYMENT RECEIPT", { x: 50, y, size: 22, font: helveticaBold });
    y -= 30;
    page.drawText("Otiko Payment Platform", { x: 50, y, size: 11, font: helvetica });
    y -= 45;

    // Horizontal line
    page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 1 });
    y -= 25;

    const drawField = (label: string, value: string) => {
      page.drawText(label, { x: 50, y, size: 9, font: helveticaBold, color: rgb(0.4, 0.4, 0.4) });
      page.drawText(value || "-", { x: 200, y, size: 10, font: helvetica });
      y -= 18;
    };

    drawField("Receipt ID", pr?.id || payout?.id || "-");
    drawField("Date Processed", pr?.processedAt || payout?.processedAt || "-");
    drawField("Organizer", pr?.organizerName || org?.name || "-");
    drawField("Organizer ID", pr?.organizerId || payout?.organizerId || "-");
    drawField("Amount", `KES ${(pr?.amount || payout?.amount || 0).toLocaleString()}`);
    drawField("Payment Method", pr?.paymentMethod || payout?.paymentMethod || "-");
    drawField("Transaction ID", payout?.mpesaTransactionId || "-");
    drawField("Processed By", pr?.processedByName || payout?.processedByName || "admin");
    drawField("Confirmation Code", pr?.confirmationCode || payout?.confirmationCode || "-");
    drawField("Status", "Completed");

    // Account details
    if (pr && pr.accountDetails) {
      y -= 10;
      page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 0.5 });
      y -= 20;
      page.drawText("Payment Destination", { x: 50, y, size: 11, font: helveticaBold });
      y -= 20;
      try {
        const details = JSON.parse(pr.accountDetails);
        if (pr.paymentMethod === "mpesa") {
          drawField("Phone", details.phoneNumber || "-");
        } else {
          drawField("Account Holder", details.bankAccountHolder || "-");
          drawField("Account Number", details.bankAccountNumber || "-");
          drawField("Bank Name", details.bankName || "-");
          drawField("Branch", details.bankBranchName || "-");
        }
      } catch { /* fallback */ }
    }

    // Footer
    y = 60;
    page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 0.5 });
    y -= 20;
    page.drawText("This is a computer-generated receipt.", { x: 50, y, size: 8, font: helvetica, color: rgb(0.6, 0.6, 0.6) });
    y -= 12;
    page.drawText(`Generated: ${new Date().toISOString()}`, { x: 50, y, size: 8, font: helvetica, color: rgb(0.6, 0.6, 0.6) });

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="receipt-${pr?.id || payout?.id}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    res.status(500).json({ error: "Failed to generate receipt PDF" });
  }
});

// Organizer self-service receipt
app.get("/api/organizers/payout-receipt/:id", async (req, res) => {
  const org = await getOrganizerByToken(req);
  if (!org) return res.status(401).json({ error: "Unauthorized" });
  // Use the same receipt generator by proxying to admin path logic
  const payout = payouts.find(p => (p.payoutRequestId === req.params.id || p.id === req.params.id) && p.organizerId === org.id);
  const pr = payoutRequests.find(p => p.id === (payout?.payoutRequestId || req.params.id) && p.organizerId === org.id);
  if (!pr && !payout) return res.status(404).json({ error: "Payout not found" });
  const receipt = pr || payout;

  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();
    const helvetica = await pdfDoc.embedStandardFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedStandardFont(StandardFonts.HelveticaBold);

    let y = height - 50;
    page.drawText("PAYMENT PROOF", { x: 50, y, size: 22, font: helveticaBold });
    y -= 30;
    page.drawText("Otiko Payment Platform", { x: 50, y, size: 11, font: helvetica });
    y -= 45;
    page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 1 });
    y -= 25;

    const drawField = (label: string, value: string) => {
      page.drawText(label, { x: 50, y, size: 9, font: helveticaBold, color: rgb(0.4, 0.4, 0.4) });
      page.drawText(value || "-", { x: 200, y, size: 10, font: helvetica });
      y -= 18;
    };

    drawField("Payout ID", pr?.id || payout?.id || "-");
    drawField("Amount", `KES ${(pr?.amount || payout?.amount || 0).toLocaleString()}`);
    drawField("Status", "Completed");
    drawField("Date Processed", pr?.processedAt || payout?.processedAt || "-");
    drawField("Payment Method", pr?.paymentMethod || payout?.paymentMethod || "-");
    drawField("Transaction ID", payout?.mpesaTransactionId || "-");

    if (pr?.accountDetails) {
      y -= 10;
      page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 0.5 });
      y -= 20;
      page.drawText("Payment Method Details", { x: 50, y, size: 11, font: helveticaBold });
      y -= 20;
      try {
        const details = JSON.parse(pr.accountDetails);
        if (pr.paymentMethod === "mpesa") {
          drawField("Phone", details.phoneNumber || "-");
        } else {
          drawField("Account Holder", details.bankAccountHolder || "-");
          drawField("Account Number", details.bankAccountNumber || "-");
          drawField("Bank Name", details.bankName || "-");
          drawField("Branch", details.bankBranchName || "-");
        }
      } catch { /* */ }
    }

    y = 60;
    page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 0.5 });
    y -= 20;
    page.drawText("This is a computer-generated payment proof document.", { x: 50, y, size: 8, font: helvetica, color: rgb(0.6, 0.6, 0.6) });
    y -= 12;
    page.drawText(`Generated: ${new Date().toISOString()}`, { x: 50, y, size: 8, font: helvetica, color: rgb(0.6, 0.6, 0.6) });

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="payment-proof-${pr?.id || payout?.id}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch {
    res.status(500).json({ error: "Failed to generate payment proof" });
  }
});

// --- ADMIN PAYOUT HISTORY (filtered, for CSV/export) ---
app.get("/api/admin/payouts", async (req, res) => {
  if (!await isAdmin(req)) return res.status(401).json({ error: "Unauthorized" });

  let result = [...payouts];
  const { organizerId, dateFrom, dateTo, status } = req.query;
  if (organizerId && typeof organizerId === "string") result = result.filter(p => p.organizerId === organizerId);
  if (dateFrom && typeof dateFrom === "string") result = result.filter(p => p.processedAt && p.processedAt >= dateFrom);
  if (dateTo && typeof dateTo === "string") result = result.filter(p => p.processedAt && p.processedAt <= dateTo);
  if (status && typeof status === "string") result = result.filter(p => p.status === status);

  // Enrich with organizer names
  const enriched = result.map(p => {
    const org = organizers.find(o => o.id === p.organizerId);
    return { ...p, organizerName: org?.name || "Unknown" };
  });

  res.json(enriched.sort((a, b) => new Date(b.processedAt || b.requestedAt).getTime() - new Date(a.processedAt || a.requestedAt).getTime()));
});

// ---------- GLOBAL ERROR HANDLER ----------
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
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
