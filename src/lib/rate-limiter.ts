import crypto from "node:crypto";
import { Db } from "mongodb";

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  retryAfterSeconds?: number;
}

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 5;

/**
 * Extracts the trusted client IP address.
 *
 * In Vercel deployments, `x-real-ip` is injected by the Vercel edge and cannot
 * be spoofed by incoming clients.
 *
 * In non-production environments (local tests/dev), falls back strictly to 127.0.0.1.
 * If in production `x-real-ip` is missing, returns null so the caller fails safely.
 */
export function getTrustedClientIp(headers: Headers): string | null {
  const realIp = headers.get("x-real-ip");
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }

  // Local development fallback
  if (process.env.NODE_ENV !== "production") {
    return "127.0.0.1";
  }

  // Production with no trusted IP header -> fail safely
  return null;
}

/**
 * Computes a keyed HMAC-SHA-256 hash of the client IP.
 * Guarantees that raw IP addresses are never logged or stored in the database.
 */
export function computeClientIpHash(ip: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(ip).digest("hex");
}

/**
 * Enforces an atomic fixed-window rate limit in MongoDB.
 *
 * The bucket key combines the keyed client hash and the active window number:
 *   _id = `${clientHash}:${windowId}`
 *
 * This guarantees atomic updates without colliding with expired documents from previous windows.
 * Expiry is enforced naturally by the window transition, with the TTL index serving
 * only for background storage cleanup.
 */
export async function checkRateLimit(
  db: Db,
  clientIp: string,
  secret: string
): Promise<RateLimitResult> {
  const clientHash = computeClientIpHash(clientIp, secret);
  const now = Date.now();
  const windowId = Math.floor(now / WINDOW_MS);
  const bucketKey = `${clientHash}:${windowId}`;
  const windowExpiry = new Date((windowId + 2) * WINDOW_MS);

  const rateLimitsCol = db.collection<{
    _id: string;
    count: number;
    expiresAt: Date;
  }>("rate_limits");

  const result = await rateLimitsCol.findOneAndUpdate(
    { _id: bucketKey },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: windowExpiry },
    },
    { upsert: true, returnDocument: "after" }
  );

  const currentCount = result ? result.count : 1;

  if (currentCount > MAX_REQUESTS_PER_WINDOW) {
    const nextWindowStart = (windowId + 1) * WINDOW_MS;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((nextWindowStart - now) / 1000)
    );

    return {
      allowed: false,
      currentCount,
      retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    currentCount,
  };
}
