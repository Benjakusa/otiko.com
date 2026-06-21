import { firestore } from "../config/firebase";
import { Event, Organizer, TicketCategory, Order, Ticket, PayoutRequest, LedgerEntry, Payout, AuditLog } from "../types";
import crypto from "crypto";

export function docId(): string {
  return crypto.randomUUID().slice(0, 8);
}

// In-memory fallbacks if Firestore isn't connected
let _organizers: Organizer[] = [];
let _events: Event[] = [];
let _ticketCategories: TicketCategory[] = [];
let _orders: Order[] = [];
let _tickets: Ticket[] = [];
let _payoutRequests: PayoutRequest[] = [];
let _auditLogs: AuditLog[] = [];

// Organizers
export async function getOrganizers(): Promise<Organizer[]> {
  if (firestore) {
    const snap = await firestore.collection("organizers").get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Organizer));
  }
  return _organizers;
}

export async function getOrganizerById(id: string): Promise<Organizer | null> {
  if (firestore) {
    const doc = await firestore.collection("organizers").doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Organizer;
  }
  return _organizers.find(o => o.id === id) || null;
}

export async function getOrganizerByFirebaseUid(uid: string): Promise<Organizer | null> {
  if (firestore) {
    const snap = await firestore.collection("organizers").where("firebaseUid", "==", uid).limit(1).get();
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as Organizer;
  }
  return _organizers.find(o => o.firebaseUid === uid) || null;
}

export async function createOrganizer(org: Organizer): Promise<void> {
  if (firestore) {
    await firestore.collection("organizers").doc(org.id).set(org);
  } else {
    _organizers.push(org);
  }
}

export async function updateOrganizer(id: string, updates: Partial<Organizer>): Promise<void> {
  if (firestore) {
    await firestore.collection("organizers").doc(id).update(updates);
  } else {
    const idx = _organizers.findIndex(o => o.id === id);
    if (idx !== -1) _organizers[idx] = { ..._organizers[idx], ...updates };
  }
}

// Events
export async function getEvents(): Promise<Event[]> {
  if (firestore) {
    const snap = await firestore.collection("events").get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Event));
  }
  return _events;
}

export async function getEventByCode(code: string): Promise<Event | null> {
  if (firestore) {
    const snap = await firestore.collection("events").where("eventCode", "==", code).limit(1).get();
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as Event;
  }
  return _events.find(e => e.eventCode === code) || null;
}

export async function createEvent(event: Event): Promise<void> {
  if (firestore) {
    await firestore.collection("events").doc(event.id).set(event);
  } else {
    _events.push(event);
  }
}

export async function updateEvent(id: string, updates: Partial<Event>): Promise<void> {
  if (firestore) {
    await firestore.collection("events").doc(id).update(updates);
  } else {
    const idx = _events.findIndex(e => e.id === id);
    if (idx !== -1) _events[idx] = { ..._events[idx], ...updates };
  }
}

// Ticket Categories
export async function getTicketCategoriesByEvent(eventId: string): Promise<TicketCategory[]> {
  if (firestore) {
    const snap = await firestore.collection("ticketCategories").where("eventId", "==", eventId).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as TicketCategory));
  }
  return _ticketCategories.filter(c => c.eventId === eventId);
}

export async function getTicketCategoryById(categoryId: string): Promise<TicketCategory | null> {
  if (firestore) {
    const doc = await firestore.collection("ticketCategories").doc(categoryId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as TicketCategory;
  }
  return _ticketCategories.find(c => c.id === categoryId) || null;
}

export async function createTicketCategories(categories: TicketCategory[]): Promise<void> {
  if (firestore) {
    const batch = firestore.batch();
    categories.forEach(cat => {
      const ref = firestore!.collection("ticketCategories").doc(cat.id);
      batch.set(ref, cat);
    });
    await batch.commit();
  } else {
    _ticketCategories.push(...categories);
  }
}

// Orders & Tickets
export async function createOrder(order: Order): Promise<void> {
  if (firestore) {
    await firestore.collection("orders").doc(order.id).set(order);
  } else {
    _orders.push(order);
  }
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  if (firestore) {
    const doc = await firestore.collection("orders").doc(orderId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Order;
  }
  return _orders.find(o => o.id === orderId) || null;
}

export async function createTickets(tickets: Ticket[]): Promise<void> {
  if (firestore) {
    const batch = firestore.batch();
    tickets.forEach(t => {
      const ref = firestore!.collection("tickets").doc(t.id);
      batch.set(ref, t);
    });
    await batch.commit();
  } else {
    _tickets.push(...tickets);
  }
}

export async function getTicketsByEvent(eventId: string): Promise<Ticket[]> {
  if (firestore) {
    const snap = await firestore.collection("tickets").where("eventId", "==", eventId).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Ticket));
  }
  return _tickets.filter(t => t.eventId === eventId);
}

// Global accessor to all for legacy or admin uses
export async function getAllTickets(): Promise<Ticket[]> {
  if (firestore) {
    const snap = await firestore.collection("tickets").get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Ticket));
  }
  return _tickets;
}

export async function getAllOrders(): Promise<Order[]> {
  if (firestore) {
    const snap = await firestore.collection("orders").get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
  }
  return _orders;
}

export async function getPayoutRequests(): Promise<PayoutRequest[]> {
  if (firestore) {
    const snap = await firestore.collection("payoutRequests").get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as PayoutRequest));
  }
  return _payoutRequests;
}
