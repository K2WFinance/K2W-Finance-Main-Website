import { NextRequest, NextResponse } from "next/server";
import { ObjectId, MongoServerError } from "mongodb";
import { getMongoDb, getMongoClient } from "@/lib/mongodb";
import {
  validateLeadSubmission,
  computePayloadFingerprint,
} from "@/lib/validations/lead";
import { getTrustedClientIp, checkRateLimit } from "@/lib/rate-limiter";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 16384; // 16 KB

/**
 * Checks whether the incoming request matches approved trusted origins.
 *
 * Localhost is enabled only in non-production environments.
 * Production checks against exact server-configured URLs (APP_URL or VERCEL_URL).
 * No unconfirmed production domains or broad wildcards are permitted.
 */
function isTrustedOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin") || req.headers.get("referer");

  // Local development allowed origins
  if (process.env.NODE_ENV !== "production") {
    if (!origin) return true; // Direct non-browser script test
    try {
      const parsed = new URL(origin);
      if (
        (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
        (parsed.port === "3000" || parsed.port === "3001")
      ) {
        return true;
      }
    } catch {
      return false;
    }
  }

  if (!origin) return false;

  let requestOrigin: string;
  try {
    requestOrigin = new URL(origin).origin;
  } catch {
    return false;
  }

  // 1. Same-origin verification against current request deployment host
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (host) {
    const deploymentOrigin = `${proto}://${host}`;
    if (requestOrigin === deploymentOrigin) {
      return true;
    }
  }

  if (req.nextUrl && req.nextUrl.origin) {
    if (requestOrigin === req.nextUrl.origin) {
      return true;
    }
  }

  // 2. Explicit server-configured origins (APP_URL or Vercel system domains)
  const allowedOrigins: string[] = [];

  if (process.env.APP_URL) {
    try {
      allowedOrigins.push(new URL(process.env.APP_URL).origin);
    } catch {
      // ignore invalid APP_URL format
    }
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    allowedOrigins.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }
  if (process.env.VERCEL_URL) {
    allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
  }
  if (process.env.VERCEL_BRANCH_URL) {
    allowedOrigins.push(`https://${process.env.VERCEL_BRANCH_URL}`);
  }

  return allowedOrigins.includes(requestOrigin);
}

export async function POST(req: NextRequest) {
  // 1. Origin verification
  if (!isTrustedOrigin(req)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FORBIDDEN_ORIGIN",
          message: "Request origin is not authorized.",
        },
      },
      { status: 403 }
    );
  }

  // 2. Content-Type check
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "Content-Type must be application/json.",
        },
      },
      { status: 415 }
    );
  }

  // 3. Payload size bound check (16KB)
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "Request payload exceeds 16KB limit.",
        },
      },
      { status: 413 }
    );
  }

  let rawBodyText: string;
  try {
    const rawBuffer = await req.arrayBuffer();
    if (rawBuffer.byteLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: "Request payload exceeds 16KB limit.",
          },
        },
        { status: 413 }
      );
    }
    rawBodyText = new TextDecoder().decode(rawBuffer);
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_BODY",
          message: "Unable to read request payload.",
        },
      },
      { status: 400 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBodyText);
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_JSON",
          message: "Request body contains malformed JSON.",
        },
      },
      { status: 400 }
    );
  }

  // 4. Honeypot check: If the hidden website field is populated, reject immediately
  if (body.website && typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SPAM_DETECTED",
          message: "Unable to process request.",
        },
      },
      { status: 400 }
    );
  }

  // 5. Authoritative Idempotency Key validation
  const idempotencyKey =
    req.headers.get("idempotency-key") || req.headers.get("x-idempotency-key");

  if (!idempotencyKey || !idempotencyKey.trim()) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "IDEMPOTENCY_KEY_REQUIRED",
          message: "Idempotency-Key header is required.",
        },
      },
      { status: 400 }
    );
  }

  const cleanIdempotencyKey = idempotencyKey.trim();

  // If requestId is also in body, require exact match
  if (
    body.requestId &&
    typeof body.requestId === "string" &&
    body.requestId.trim() !== cleanIdempotencyKey
  ) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "IDEMPOTENCY_KEY_MISMATCH",
          message: "Idempotency-Key header does not match body requestId.",
        },
      },
      { status: 400 }
    );
  }

  // 6. Server-side validation and canonical normalization
  const validation = validateLeadSubmission(body);
  if (!validation.valid || !validation.normalized) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_FAILED",
          message: "Please correct the invalid fields.",
          fields: validation.errors,
        },
      },
      { status: 400 }
    );
  }

  const normalized = validation.normalized;
  const payloadFingerprint = computePayloadFingerprint(normalized);

  // 7. Database connection
  let client;
  let db;
  try {
    client = await getMongoClient();
    db = await getMongoDb();
  } catch (err) {
    console.error("Database connection failure:", err instanceof Error ? err.message : "Unknown");
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DATABASE_UNAVAILABLE",
          message: "Unable to process consultation request at this time.",
        },
      },
      { status: 500 }
    );
  }

  // 8. Idempotency Check BEFORE Rate Limiting
  // Legitimate retries of committed submissions must not be penalized by rate limits
  try {
    const existingEnquiry = await db.collection("enquiries").findOne({
      idempotencyKey: cleanIdempotencyKey,
    });

    if (existingEnquiry) {
      if (existingEnquiry.payloadFingerprint === payloadFingerprint) {
        // Idempotent duplicate: return original successful result with 200 OK
        return NextResponse.json(
          {
            success: true,
            data: {
              enquiryId: existingEnquiry._id.toString(),
              message: `Thank you, ${existingEnquiry.name}. Your consultation request has been received.`,
            },
          },
          { status: 200 }
        );
      } else {
        // Conflicting payload for the same key -> return 409 Conflict
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "IDEMPOTENCY_CONFLICT",
              message:
                "Idempotency key already used for a different consultation payload.",
            },
          },
          { status: 409 }
        );
      }
    }
  } catch (err) {
    console.error("Idempotency lookup error:", err instanceof Error ? err.message : "Unknown");
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Unable to verify submission idempotency.",
        },
      },
      { status: 500 }
    );
  }

  // 9. Trusted Client IP Extraction & Atomic Rate Limiting
  const trustedIp = getTrustedClientIp(req.headers);
  if (!trustedIp) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CLIENT_IP_UNAVAILABLE",
          message: "Unable to verify client connection.",
        },
      },
      { status: 500 }
    );
  }

  const rateLimitSecret =
    process.env.RATE_LIMIT_SECRET || "default_local_dev_k2w_rate_secret";

  try {
    const rateResult = await checkRateLimit(db, trustedIp, rateLimitSecret);
    if (!rateResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message:
              "Too many consultation requests. Please try again in a few minutes.",
          },
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateResult.retryAfterSeconds || 600),
          },
        }
      );
    }
  } catch (err) {
    console.error("Rate limiter failure:", err instanceof Error ? err.message : "Unknown");
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RATE_LIMIT_UNAVAILABLE",
          message: "Service temporarily unavailable. Please try again later.",
        },
      },
      { status: 500 }
    );
  }

  // 10. Multi-Document Transaction Execution with Bounded Concurrency Retries
  const MAX_TRANSACTION_ATTEMPTS = 3;
  let attempt = 0;

  while (attempt < MAX_TRANSACTION_ATTEMPTS) {
    attempt++;
    const session = client.startSession();

    try {
      let createdEnquiryId: ObjectId | null = null;

      await session.withTransaction(async () => {
        const now = new Date();

        // Step A: Contact Grouping (Phone-Grouped Contact Summary)
        // Phone matching is this project's proposed grouping policy for financial enquiries
        let lead = await db
          .collection("leads")
          .findOne({ phone: normalized.phone }, { session });

        let leadId: ObjectId;

        if (lead) {
          leadId = lead._id;
          // Update lastActiveAt and increment enquiry count while preserving original contact identity
          await db.collection("leads").updateOne(
            { _id: leadId },
            {
              $set: { lastActiveAt: now },
              $inc: { totalEnquiries: 1 },
            },
            { session }
          );
        } else {
          // New phone-grouped contact: record first approved contact identity
          const leadInsertResult = await db.collection("leads").insertOne(
            {
              phone: normalized.phone,
              name: normalized.name,
              email: normalized.email,
              firstSeenAt: now,
              lastActiveAt: now,
              totalEnquiries: 1,
            },
            { session }
          );
          leadId = leadInsertResult.insertedId;
        }

        // Step B: Immutable Enquiry Record (Stores exact submitted name, phone, email)
        const enquiryInsertResult = await db.collection("enquiries").insertOne(
          {
            leadId,
            idempotencyKey: cleanIdempotencyKey,
            payloadFingerprint,
            name: normalized.name,
            phone: normalized.phone,
            email: normalized.email,
            interest: normalized.interest,
            consent: normalized.consent,
            status: "received",
            createdAt: now,
          },
          { session }
        );
        createdEnquiryId = enquiryInsertResult.insertedId;

        // Step C: Campaign Touchpoint Record (Strictly 1 touchpoint per enquiry)
        if (Object.keys(normalized.attribution).length > 0) {
          await db.collection("campaign_touchpoints").insertOne(
            {
              leadId,
              enquiryId: createdEnquiryId,
              ...normalized.attribution,
              landingPath: "/",
              createdAt: now,
            },
            { session }
          );
        }
      });

      // Transaction committed successfully
      return NextResponse.json(
        {
          success: true,
          data: {
            enquiryId: createdEnquiryId!.toString(),
            message: `Thank you, ${normalized.name}. Your consultation request has been received.`,
          },
        },
        { status: 201 }
      );
    } catch (err: unknown) {
      // 1. Transaction capability check: fail honestly if unsupported
      if (
        err instanceof Error &&
        (err.message.includes("Transaction numbers are only allowed on a replica set") ||
          err.message.includes("Transactions are not supported"))
      ) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "DATABASE_TRANSACTIONS_UNSUPPORTED",
              message:
                "Database transactions are required but unsupported by this environment.",
            },
          },
          { status: 500 }
        );
      }

      // 2. Duplicate key error resolution by index pattern
      if (err instanceof MongoServerError && err.code === 11000) {
        const errorMsg = err.message || "";
        const keyPattern = (err as unknown as { keyPattern?: Record<string, number> })
          .keyPattern;

        // A. Idempotency Key Collision: resolve via committed enquiry
        if (keyPattern?.idempotencyKey || errorMsg.includes("idempotencyKey")) {
          // Another concurrent request committed with the same key
          const committed = await db.collection("enquiries").findOne({
            idempotencyKey: cleanIdempotencyKey,
          });

          if (committed) {
            if (committed.payloadFingerprint === payloadFingerprint) {
              return NextResponse.json(
                {
                  success: true,
                  data: {
                    enquiryId: committed._id.toString(),
                    message: `Thank you, ${committed.name}. Your consultation request has been received.`,
                  },
                },
                { status: 200 }
              );
            } else {
              return NextResponse.json(
                {
                  success: false,
                  error: {
                    code: "IDEMPOTENCY_CONFLICT",
                    message:
                      "Idempotency key already used for a different consultation payload.",
                  },
                },
                { status: 409 }
              );
            }
          }
        }

        // B. Phone Key Collision: two concurrent requests inserting same new phone
        // Retry transaction: the next attempt will find the now-existing lead
        if (keyPattern?.phone || errorMsg.includes("phone")) {
          if (attempt < MAX_TRANSACTION_ATTEMPTS) {
            await new Promise((r) => setTimeout(r, 40 * attempt));
            continue;
          }
        }
      }

      // 3. Transient transaction error: retry with backoff
      if (
        err instanceof MongoServerError &&
        err.hasErrorLabel &&
        err.hasErrorLabel("TransientTransactionError") &&
        attempt < MAX_TRANSACTION_ATTEMPTS
      ) {
        await new Promise((r) => setTimeout(r, 50 * attempt));
        continue;
      }

      // Unrecoverable error
      console.error(
        "Transaction execution failed:",
        err instanceof Error ? err.message : "Unknown"
      );
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TRANSACTION_FAILED",
            message: "Unable to complete consultation submission.",
          },
        },
        { status: 500 }
      );
    } finally {
      await session.endSession();
    }
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "CONCURRENCY_EXHAUSTED",
        message: "Unable to complete submission due to concurrent activity. Please retry.",
      },
    },
    { status: 500 }
  );
}
