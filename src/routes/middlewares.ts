import express from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { getRedis, RedisRateLimitStore, isSessionRevoked } from "../../redis";
import { firebaseAuth } from "../config/firebase";
import { getOrganizerByFirebaseUid } from "../services/db";
import crypto from "crypto";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  standardHeaders: true, legacyHeaders: false,
  store: new RedisRateLimitStore(),
  message: { error: "Too many requests. Please try again later." },
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 30,
  standardHeaders: true, legacyHeaders: false,
  store: new RedisRateLimitStore(),
  message: { error: "Too many requests. Please try again later." },
});

export const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 100,
  standardHeaders: true, legacyHeaders: false,
  store: new RedisRateLimitStore(),
  message: { error: "Too many requests. Please try again later." },
});

export function validate(schema: z.ZodType) {
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

export const schemas = {
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
};

export async function getOrganizerByToken(req: express.Request) {
  let token = req.cookies?.token;
  if (!token) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    token = authHeader.split(" ")[1];
  }

  if (firebaseAuth) {
    try {
      const decoded = await firebaseAuth.verifyIdToken(token);
      if (await isSessionRevoked(decoded.uid, decoded.iat)) {
        return null;
      }
      return await getOrganizerByFirebaseUid(decoded.uid);
    } catch (err) {
      return null;
    }
  }

  if (process.env.ALLOW_DEMO_AUTH === "true" && !token.startsWith("eyJ")) {
    return await getOrganizerByFirebaseUid(token);
  }

  return null;
}

export function redisCache(ttlSeconds: number) {
  return async (req: express.Request, res: any, next: express.NextFunction) => {
    if (req.method !== "GET") return next();
    const redis = getRedis();
    if (!redis) return next();
    
    const key = `cache:${req.originalUrl || req.url}`;
    try {
      const cached = await redis.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        redis.setEx(key, ttlSeconds, JSON.stringify(body)).catch(() => {});
        return originalJson(body);
      };
      next();
    } catch {
      next();
    }
  };
}

export async function bustCache(path: string) {
  const redis = getRedis();
  if (redis) {
    await redis.del(`cache:${path}`);
  }
}

let eventCodeCounter = 124;
export function generateEventCode(): string {
  const code = eventCodeCounter++;
  return `OTK-2026-${String(code).padStart(6, "0")}`;
}
