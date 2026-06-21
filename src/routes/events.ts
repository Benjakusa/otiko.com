import { Router } from "express";
import { getEvents, getEventByCode, createEvent, updateEvent, getTicketCategoriesByEvent, createTicketCategories, docId } from "../services/db";
import { schemas, validate, publicLimiter, apiLimiter, getOrganizerByToken, bustCache, redisCache, generateEventCode } from "./middlewares";
import { Event, TicketCategory } from "../types";

const router = Router();

router.get("/", publicLimiter, async (req, res) => {
  const { status, search } = req.query;
  let allEvents = await getEvents();

  const org = await getOrganizerByToken(req);
  if (org) {
    allEvents = allEvents.filter(e => e.organizerId === org.id);
  }

  if (status) allEvents = allEvents.filter(e => e.status === status);
  if (search) {
    const q = String(search).toLowerCase();
    allEvents = allEvents.filter(e => e.name.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q));
  }

  // NOTE: This N+1 fetching of categories should be optimized in production DB calls, 
  // but for now it preserves the existing API contract.
  const result = await Promise.all(allEvents.map(async evt => {
    const cats = await getTicketCategoriesByEvent(evt.id);
    const minPrice = cats.reduce((min, cat) => cat.price < min ? cat.price : min, cats[0]?.price || 0);
    const maxPrice = cats.reduce((max, cat) => cat.price > max ? cat.price : max, cats[0]?.price || 0);
    const isSoldOut = cats.length > 0 && cats.every(c => c.remainingQuantity <= 0);
    return { ...evt, categories: cats, minPrice, maxPrice, isSoldOut };
  }));

  res.json(result);
});

router.get("/:code", publicLimiter, redisCache(30), async (req, res) => {
  const { code } = req.params;
  const evt = await getEventByCode(code);
  if (!evt) return res.status(404).json({ error: "Event not found" });

  const cats = await getTicketCategoriesByEvent(evt.id);
  const minPrice = cats.reduce((min, cat) => cat.price < min ? cat.price : min, cats[0]?.price || 0);
  const maxPrice = cats.reduce((max, cat) => cat.price > max ? cat.price : max, cats[0]?.price || 0);
  const isSoldOut = cats.length > 0 && cats.every(c => c.remainingQuantity <= 0);

  res.json({ ...evt, categories: cats, minPrice, maxPrice, isSoldOut });
});

router.post("/", apiLimiter, validate(schemas.createEvent), async (req, res) => {
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

  await createEvent(newEvt);

  const formattedCats: TicketCategory[] = categories.map((c: any, index: number) => ({
    id: `cat-${newEventId.slice(4)}-${index}`, eventId: newEventId,
    name: c.name || `Category ${index + 1}`, price: Number(c.price),
    totalQuantity: Number(c.totalQuantity), remainingQuantity: Number(c.totalQuantity),
    createdAt: new Date().toISOString()
  }));

  await createTicketCategories(formattedCats);

  res.status(201).json({ ...newEvt, categories: formattedCats });
});

router.patch("/:code", validate(schemas.updateEvent), async (req, res) => {
  const org = await getOrganizerByToken(req);
  if (!org) return res.status(401).json({ error: "Unauthorized" });

  const { code } = req.params;
  const evt = await getEventByCode(code);
  if (!evt) return res.status(404).json({ error: "Event not found" });
  if (evt.organizerId !== org.id) return res.status(403).json({ error: "You do not own this event" });

  try {
    const { name, flyerUrl, eventDate, venue, description, status } = req.body;
    const updates: Partial<Event> = { updatedAt: new Date().toISOString() };
    if (name) updates.name = name;
    if (flyerUrl) updates.flyerUrl = flyerUrl;
    if (eventDate) updates.eventDate = eventDate;
    if (venue) updates.venue = venue;
    if (description) updates.description = description;
    if (status) updates.status = status;

    await updateEvent(evt.id, updates);
    bustCache(`/api/events/${code}`).catch(() => {});
    res.json({ ...evt, ...updates });
  } catch (err) {
    res.status(500).json({ error: "Failed to update event" });
  }
});

export default router;
