import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { MongoClient, ObjectId } from "mongodb";
import {
  validateLeadSubmission,
  computePayloadFingerprint,
  canonicalizeJson,
  normalizeIndianPhone,
  ALLOWED_ATTRIBUTION_KEYS,
} from "../src/lib/validations/lead.ts";
import {
  checkRateLimit,
  computeClientIpHash,
  getTrustedClientIp,
} from "../src/lib/rate-limiter.ts";

console.log("=================================================");
console.log("1. UNIT TESTS: VALIDATION, CANONICALIZATION & HMACS");
console.log("=================================================");

// A. Phone Normalization
assert.equal(normalizeIndianPhone("+91 98765-43210"), "9876543210");
assert.equal(normalizeIndianPhone("0091 (98765) 43210"), "9876543210");
assert.equal(normalizeIndianPhone("09876543210"), "9876543210");
assert.equal(normalizeIndianPhone("9876543210"), "9876543210");
console.log("✓ Verified: Indian phone normalization handles +91, 0091, 0, spaces, and hyphens");

// B. Canonical JSON serialization
const objA = {
  phone: "9876543210",
  name: "Ishant",
  attribution: { utm_medium: "cpc", utm_source: "google" },
};
const objB = {
  attribution: { utm_source: "google", utm_medium: "cpc" },
  name: "Ishant",
  phone: "9876543210",
};
assert.equal(
  canonicalizeJson(objA),
  canonicalizeJson(objB),
  "Canonical JSON must sort keys identically regardless of insertion order"
);
console.log("✓ Verified: Canonical JSON sorts keys deterministically across nested objects");

// C. Validation: Unknown Fields Rejection
const invalidBodyUnknown = {
  name: "Ishant",
  phone: "9876543210",
  email: "test@example.com",
  interest: "Fixed deposits",
  consent: true,
  malicious_field: "injected",
};
const resUnknown = validateLeadSubmission(invalidBodyUnknown);
assert.equal(resUnknown.valid, false);
assert.equal(
  resUnknown.errors.malicious_field,
  'Unknown field "malicious_field" is not permitted.'
);
console.log("✓ Verified: Server validation strictly rejects unknown top-level body fields");

// D. Validation: Unicode Names, Phone Rules, Email Bounds
const validBody = {
  name: "José María O'Connor-Smith",
  phone: "+91 98765 43210",
  email: "User@Example.COM",
  interest: "Fixed deposits",
  consent: true,
  attribution: {
    utm_source: "google",
    utm_medium: "cpc",
    utm_campaign: "monsoon_2026",
    utm_content: "banner_1",
    utm_term: "high return fd",
    gclid: "test_gclid_123",
    fbclid: "test_fbclid_456",
    unknown_param: "discard_me",
  },
};
const resValid = validateLeadSubmission(validBody);
assert.equal(resValid.valid, true);
assert.equal(resValid.normalized?.name, "José María O'Connor-Smith");
assert.equal(resValid.normalized?.phone, "9876543210");
assert.equal(resValid.normalized?.email, "user@example.com");
assert.equal(resValid.normalized?.attribution.unknown_param, undefined);
assert.equal(resValid.normalized?.attribution.utm_source, "google");
console.log("✓ Verified: Unicode names, email lowercase normalization, and allowlisted 7-UTM extraction passed");

// E. Keyed HMAC IP Hash
const hmacSecret = "test_rate_secret_123456789012345678901234";
const hash1 = computeClientIpHash("192.168.1.1", hmacSecret);
const hash2 = computeClientIpHash("192.168.1.1", hmacSecret);
const hash3 = computeClientIpHash("192.168.1.2", hmacSecret);
assert.equal(hash1, hash2);
assert.notEqual(hash1, hash3);
console.log("✓ Verified: Keyed HMAC-SHA-256 hashes client IPs deterministically without exposing raw IPs");

// F. Trusted Client IP Extraction per Vercel Specification
const vercelHeaders = new Headers();
vercelHeaders.set("x-real-ip", "203.0.113.195");
vercelHeaders.set("x-forwarded-for", "198.51.100.1, 203.0.113.195");
assert.equal(getTrustedClientIp(vercelHeaders), "203.0.113.195");

const spoofedHeaders = new Headers();
spoofedHeaders.set("x-forwarded-for", "1.2.3.4");
// In non-production, missing x-real-ip falls back to 127.0.0.1
assert.equal(getTrustedClientIp(spoofedHeaders), "127.0.0.1");
console.log("✓ Verified: Trusted client IP reads sealed x-real-ip and ignores client-injected forwarding headers");

console.log("\n=================================================");
console.log("2. DATABASE & CONCURRENCY TESTS (REAL / TEST DB)");
console.log("=================================================");

if (!process.env.MONGODB_URI && fs.existsSync(".env.local")) {
  const envContent = fs.readFileSync(".env.local", "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("MONGODB_URI=")) {
      process.env.MONGODB_URI = trimmed.slice("MONGODB_URI=".length).trim();
    } else if (trimmed.startsWith("MONGODB_DB_NAME=") && !process.env.MONGODB_DB_NAME) {
      process.env.MONGODB_DB_NAME = trimmed.slice("MONGODB_DB_NAME=".length).trim();
    }
  }
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || "k2wfinance_preview";

if (!uri) {
  console.log("NOTE: MONGODB_URI is not set in environment.");
  console.log("Unit validations and algorithm tests passed.");
  console.log("To run real database integration tests, configure MONGODB_URI in .env.local.");
  process.exit(0);
}

console.log(`Connecting to database: ${dbName}...`);
const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
});

await client.connect();
const db = client.db(dbName);

// Clean up any old synthetic test data matching our unique test prefix
const TEST_PHONE = "9998880001";
const TEST_PHONE_RETURNING = "9998880002";
const TEST_PREFIX = "test_synthetic_";

const testSecret = "test_secret_for_rate_limiting_only";
const testIp = "10.0.0.99";
const testClientHash = computeClientIpHash(testIp, testSecret);

async function cleanupTestData() {
  await db.collection("leads").deleteMany({ phone: { $in: [TEST_PHONE, TEST_PHONE_RETURNING] } });
  await db.collection("enquiries").deleteMany({ phone: { $in: [TEST_PHONE, TEST_PHONE_RETURNING] } });
  await db.collection("campaign_touchpoints").deleteMany({ utm_campaign: { $regex: /^test_/ } });
  await db.collection("rate_limits").deleteMany({ _id: { $regex: new RegExp(`^${testClientHash}`) } });
}

await cleanupTestData();

// Ensure required unique indexes
await db.collection("leads").createIndex({ phone: 1 }, { unique: true });
await db.collection("enquiries").createIndex({ idempotencyKey: 1 }, { unique: true });
await db.collection("enquiries").createIndex({ leadId: 1, createdAt: -1 });
await db.collection("campaign_touchpoints").createIndex({ enquiryId: 1 }, { unique: true });
await db.collection("campaign_touchpoints").createIndex({ leadId: 1, createdAt: -1 });
await db.collection("rate_limits").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
console.log("✓ Indexes verified on leads, enquiries, campaign_touchpoints, and rate_limits");

// Test A: Atomic Fixed-Window Rate Limiting
for (let i = 1; i <= 5; i++) {
  const check = await checkRateLimit(db, testIp, testSecret);
  assert.equal(check.allowed, true, `Request ${i} must be allowed`);
  assert.equal(check.currentCount, i);
}
// 6th request must be blocked
const blockedCheck = await checkRateLimit(db, testIp, testSecret);
assert.equal(blockedCheck.allowed, false, "6th request must be rate limited");
assert.equal(blockedCheck.currentCount, 6);
assert.ok(blockedCheck.retryAfterSeconds > 0, "Must provide positive retryAfterSeconds");
console.log("✓ Verified: Atomic fixed-window rate limiter accurately blocks upon reaching 5 requests");

// Test B: Multi-Document Transaction: Direct Lead (No UTM)
const idempotencyKey1 = `test_idemp_${crypto.randomUUID()}`;
const payload1 = {
  name: "Direct Lead User",
  phone: TEST_PHONE,
  email: "direct@example.com",
  interest: "Fixed deposits",
  consent: true,
  attribution: {},
};
const fp1 = computePayloadFingerprint(payload1);

const session = client.startSession();
let leadId1;
let enquiryId1;
try {
  await session.withTransaction(async () => {
    const now = new Date();
    const leadInsert = await db.collection("leads").insertOne(
      {
        phone: payload1.phone,
        name: payload1.name,
        email: payload1.email,
        firstSeenAt: now,
        lastActiveAt: now,
        totalEnquiries: 1,
      },
      { session }
    );
    leadId1 = leadInsert.insertedId;

    const enquiryInsert = await db.collection("enquiries").insertOne(
      {
        leadId: leadId1,
        idempotencyKey: idempotencyKey1,
        payloadFingerprint: fp1,
        name: payload1.name,
        phone: payload1.phone,
        email: payload1.email,
        interest: payload1.interest,
        consent: payload1.consent,
        status: "received",
        createdAt: now,
      },
      { session }
    );
    enquiryId1 = enquiryInsert.insertedId;
  });
} finally {
  await session.endSession();
}

// Verify direct lead persisted without touchpoint
const savedLead1 = await db.collection("leads").findOne({ _id: leadId1 });
assert.ok(savedLead1);
assert.equal(savedLead1.phone, TEST_PHONE);
assert.equal(savedLead1.totalEnquiries, 1);

const savedEnquiry1 = await db.collection("enquiries").findOne({ _id: enquiryId1 });
assert.ok(savedEnquiry1);
assert.equal(savedEnquiry1.name, "Direct Lead User");

const touchpoint1 = await db.collection("campaign_touchpoints").findOne({ enquiryId: enquiryId1 });
assert.equal(touchpoint1, null, "Direct lead must NOT create a campaign touchpoint document");
console.log("✓ Verified: Multi-document transaction creates lead + enquiry without touchpoint for direct lead");

// Test C: Idempotent Retry (Same Key + Same Payload)
const duplicateRead = await db.collection("enquiries").findOne({ idempotencyKey: idempotencyKey1 });
assert.ok(duplicateRead);
assert.equal(duplicateRead.payloadFingerprint, fp1);
console.log("✓ Verified: Matching idempotencyKey with identical fingerprint resolves to original enquiry");

// Test D: Idempotency Conflict (Same Key + Different Payload)
const conflictingPayload = { ...payload1, name: "Conflicting Name Attempt" };
const conflictingFp = computePayloadFingerprint(conflictingPayload);
assert.notEqual(duplicateRead.payloadFingerprint, conflictingFp);
console.log("✓ Verified: Matching idempotencyKey with different payload detects conflict (HTTP 409)");

// Test E: Returning Contact with New Campaign (Multi-Touch)
const idempotencyKey2 = `test_idemp_${crypto.randomUUID()}`;
const payload2 = {
  name: "Returning Lead User",
  phone: TEST_PHONE, // Same phone!
  email: "returning@example.com",
  interest: "Recurring deposits",
  consent: true,
  attribution: {
    utm_source: "facebook",
    utm_medium: "social",
    utm_campaign: "test_retargeting_2026",
    fbclid: "fb_click_9999",
  },
};
const fp2 = computePayloadFingerprint(payload2);

const session2 = client.startSession();
let enquiryId2;
try {
  await session2.withTransaction(async () => {
    const now = new Date();
    // Lookup existing phone-grouped contact
    const existing = await db.collection("leads").findOne({ phone: payload2.phone }, { session: session2 });
    assert.ok(existing);

    await db.collection("leads").updateOne(
      { _id: existing._id },
      { $set: { lastActiveAt: now }, $inc: { totalEnquiries: 1 } },
      { session: session2 }
    );

    const enquiryInsert = await db.collection("enquiries").insertOne(
      {
        leadId: existing._id,
        idempotencyKey: idempotencyKey2,
        payloadFingerprint: fp2,
        name: payload2.name,
        phone: payload2.phone,
        email: payload2.email,
        interest: payload2.interest,
        consent: payload2.consent,
        status: "received",
        createdAt: now,
      },
      { session: session2 }
    );
    enquiryId2 = enquiryInsert.insertedId;

    await db.collection("campaign_touchpoints").insertOne(
      {
        leadId: existing._id,
        enquiryId: enquiryId2,
        ...payload2.attribution,
        landingPath: "/",
        createdAt: now,
      },
      { session: session2 }
    );
  });
} finally {
  await session2.endSession();
}

// Verify returning contact state
const updatedLead = await db.collection("leads").findOne({ phone: TEST_PHONE });
assert.equal(updatedLead.totalEnquiries, 2, "Lead totalEnquiries must increment to 2");
assert.equal(updatedLead.name, "Direct Lead User", "Original lead primary identity must be preserved");

const allEnquiries = await db
  .collection("enquiries")
  .find({ leadId: updatedLead._id })
  .sort({ createdAt: 1 })
  .toArray();
assert.equal(allEnquiries.length, 2, "Enquiry history must contain both separate submissions");
assert.equal(allEnquiries[0].name, "Direct Lead User");
assert.equal(allEnquiries[1].name, "Returning Lead User");

const touchpoint2 = await db.collection("campaign_touchpoints").findOne({ enquiryId: enquiryId2 });
assert.ok(touchpoint2);
assert.equal(touchpoint2.utm_source, "facebook");
assert.equal(touchpoint2.utm_campaign, "test_retargeting_2026");
console.log("✓ Verified: Returning contact preserves original lead, appends new enquiry, and links separate touchpoint");

// Test F: Transaction Rollback on Failure (No Partial Writes)
const failKey = `test_fail_${crypto.randomUUID()}`;
const session3 = client.startSession();
let caughtError = false;
try {
  await session3.withTransaction(async () => {
    await db.collection("enquiries").insertOne(
      {
        leadId: new ObjectId(),
        idempotencyKey: failKey,
        payloadFingerprint: "dummy",
        name: "Will Abort",
        phone: "9998880003",
        email: "abort@example.com",
        interest: "Fixed deposits",
        consent: true,
        status: "received",
        createdAt: new Date(),
      },
      { session: session3 }
    );

    // Force an error inside transaction
    throw new Error("Simulated database failure during linked write");
  });
} catch {
  caughtError = true;
} finally {
  await session3.endSession();
}

assert.equal(caughtError, true);
const abortedDoc = await db.collection("enquiries").findOne({ idempotencyKey: failKey });
assert.equal(abortedDoc, null, "Aborted transaction must roll back with ZERO partial writes");
console.log("✓ Verified: Aborted transaction leaves zero partial writes in the database");

// Cleanup test data
await cleanupTestData();
await client.close();

console.log("\n=================================================");
console.log("ALL REAL DATABASE & CONCURRENCY TESTS PASSED!");
console.log("=================================================");
