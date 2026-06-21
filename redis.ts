import { createClient, RedisClientType } from "redis";

const REDIS_URL = process.env.REDIS_URL || "";

let redis: RedisClientType | null = null;

// Prefix all ticket-inventory keys
const TICKET_KEY = (id: string) => `ticket:cat:${id}:remaining`;

export async function initRedis(): Promise<RedisClientType | null> {
  if (!REDIS_URL) {
    console.log("[Redis] REDIS_URL not set — running without Redis");
    return null;
  }
  redis = createClient({ url: REDIS_URL });
  redis.on("error", (err) => console.error("[Redis] Client error:", err));
  await redis.connect();
  console.log("[Redis] Connected");
  return redis;
}

export function getRedis(): RedisClientType | null {
  return redis;
}

/** Seed a single category's remaining count into Redis (idempotent — skips if key exists). */
export async function seedCategoryInventory(categoryId: string, remaining: number): Promise<void> {
  if (!redis) return;
  const key = TICKET_KEY(categoryId);
  const exists = await redis.exists(key);
  if (!exists) {
    await redis.set(key, remaining);
  }
}

/** Populate all categories at startup. */
export async function seedAllCategories(categories: { id: string; remainingQuantity: number }[]): Promise<void> {
  if (!redis) return;
  for (const c of categories) {
    await seedCategoryInventory(c.id, c.remainingQuantity);
  }
}

/**
 * Atomic reservation — Lua script.
 *
 * Keys: [categoryKey]
 * Args: [quantity]
 *
 * Returns:
 *   1  → reservation succeeded (remaining >= 0 after decrement)
 *   0  → not enough tickets (aborted, no change)
 *  -1  → key does not exist
 */
const RESERVE_LUA = `
  local key = KEYS[1]
  local qty = tonumber(ARGV[1])
  local remaining = redis.call("GET", key)
  if not remaining then return -1 end
  remaining = tonumber(remaining)
  if remaining < qty then return 0 end
  redis.call("DECRBY", key, qty)
  return 1
`;

let reserveScriptSha: string | null = null;

async function loadReserveScript(): Promise<void> {
  if (!redis) return;
  reserveScriptSha = await redis.scriptLoad(RESERVE_LUA);
}

/**
 * Attempt an atomic ticket reservation.
 *
 * Returns { ok: true, remaining } or { ok: false, reason }.
 */
export async function tryReserveTickets(
  categoryId: string,
  quantity: number,
): Promise<{ ok: true; remaining: number } | { ok: false; reason: string }> {
  if (!redis) {
    return { ok: false, reason: "REDIS_UNAVAILABLE" };
  }

  // Load script on first call
  if (!reserveScriptSha) {
    await loadReserveScript();
  }

  const key = TICKET_KEY(categoryId);
  let result: number;
  try {
    result = await redis.evalSha(reserveScriptSha!, {
      keys: [key],
      arguments: [String(quantity)],
    }) as number;
  } catch (e) {
    // Script may not be cached — load and retry
    reserveScriptSha = null;
    await loadReserveScript();
    try {
      result = await redis.evalSha(reserveScriptSha!, {
        keys: [key],
        arguments: [String(quantity)],
      }) as number;
    } catch {
      return { ok: false, reason: "REDIS_ERROR" };
    }
  }

  if (result === -1) {
    return { ok: false, reason: "CATEGORY_NOT_FOUND" };
  }
  if (result === 0) {
    return { ok: false, reason: "NOT_ENOUGH_TICKETS" };
  }

  // Read post-decrement remaining
  const raw = await redis!.get(key) as unknown as string | null;
  const remaining = raw !== null ? parseInt(raw, 10) : -1;

  return { ok: true, remaining };
}

/**
 * Release tickets back to inventory (used by sweeper on expired orders).
 */
export async function releaseTickets(categoryId: string, quantity: number): Promise<void> {
  if (!redis) return;
  const key = TICKET_KEY(categoryId);
  await redis.incrBy(key, quantity);
}

/**
 * Redis-backed store for express-rate-limit.
 *
 * Implements the required Store interface using INCR + PEXPIRE so that
 * counter state is shared across all server instances.
 */
export class RedisRateLimitStore {
  private windowMs = 60_000;
  localKeys = false;

  init(options: { windowMs: number }): void {
    this.windowMs = options.windowMs;
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime: Date }> {
    if (!redis) {
      return { totalHits: 1, resetTime: new Date(Date.now() + this.windowMs) };
    }
    const redisKey = `rl:${key}`;
    const totalHits = await redis.incr(redisKey);
    if (totalHits === 1) {
      await redis.pExpire(redisKey, this.windowMs);
    }
    const ttl = await redis.pTTL(redisKey);
    const resetTime = new Date(Date.now() + Math.max(0, ttl));
    return { totalHits, resetTime };
  }

  async decrement(key: string): Promise<void> {
    if (!redis) return;
    const redisKey = `rl:${key}`;
    await redis.decr(redisKey);
  }

  async resetKey(key: string): Promise<void> {
    if (!redis) return;
    await redis.del(`rl:${key}`);
  }
}

/**
 * Express middleware that caches successful GET responses in Redis.
 *
 * - Only caches 2xx responses that call `res.json()`
 * - Cache key = `http:cache:<req.originalUrl>`
 * - TTL in seconds (default 30)
 * - Fail-open: if Redis is down, the request passes through
 */
export function redisCache(ttlSeconds = 30) {
  return (req: any, res: any, next: any) => {
    if (!redis || req.method !== "GET") return next();

    const cacheKey = `http:cache:${req.originalUrl}`;

    redis.get(cacheKey).then((cached: string | null) => {
      if (cached) {
        const parsed = JSON.parse(cached);
        res.setHeader("X-Cache", "HIT");
        return res.json(parsed);
      }

      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redis!.setEx(cacheKey, ttlSeconds, JSON.stringify(body)).catch(() => {});
        }
        return originalJson(body);
      };
      next();
    }).catch(() => next());
  };
}

/**
 * Bust a cached GET response key in Redis.
 */
export async function bustCache(pattern: string): Promise<void> {
  if (!redis) return;
  const cacheKey = `http:cache:${pattern}`;
  await redis.del(cacheKey);
}

/**
 * Mark a Firebase session as revoked in Redis.
 *
 * Key: `revoked:session:<uid>:<iat>`   Value: "1"   TTL: remaining token lifetime (ms)
 * On every authenticated request, `isSessionRevoked` is checked after Firebase
 * verification. If Redis is down the check is skipped (fail-open).
 */
export async function markSessionRevoked(uid: string, iat: number, expiresAt: number): Promise<void> {
  if (!redis) return;
  const key = `revoked:session:${uid}:${iat}`;
  const ttl = Math.max(1, expiresAt * 1000 - Date.now());
  await redis.setEx(key, Math.ceil(ttl / 1000), "1");
}

/**
 * Check whether a session was revoked.
 * Returns `true` if the key exists (session has been revoked).
 * Returns `false` if the key doesn't exist or Redis is unreachable (fail-open).
 */
export async function isSessionRevoked(uid: string, iat: number): Promise<boolean> {
  if (!redis) return false;
  try {
    const exists = await redis.exists(`revoked:session:${uid}:${iat}`);
    return exists === 1;
  } catch {
    return false;
  }
}

/**
 * Return the current Redis connection status for health checks.
 */
export function getRedisHealth(): { connected: boolean; url: string } {
  return {
    connected: redis !== null && redis.isOpen,
    url: REDIS_URL ? REDIS_URL.replace(/redis:\/\/.*@/, "redis://***@") : "(not configured)",
  };
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
