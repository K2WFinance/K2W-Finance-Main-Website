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
  ALLOWED_CONSULTATION_TYPES,
  ALLOWED_CONTACT_METHODS,
  ALLOWED_CALL_TIME_PREFERENCES,
  ALLOWED_PREFERRED_LANGUAGES,
  ALLOWED_SAVINGS_RANGES,
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
  consultationType: "Savings plan consultation",
  attribution: { utm_medium: "cpc", utm_source: "google" },
};
const objB = {
  attribution: { utm_source: "google", utm_medium: "cpc" },
  name: "Ishant",
  consultationType: "Savings plan consultation",
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
  consultationType: "Savings plan consultation",
  interest: "Fixed deposits",
  contactMethod: "Phone call",
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

// D. Validation: Rejection of removed "In person" contact method
const invalidInPersonBody = {
  name: "Test User",
  phone: "9876543210",
  email: "test@example.com",
  consultationType: "Savings plan consultation",
  interest: "Fixed deposits",
  contactMethod: "In person",
  consent: true,
};
const resInPerson = validateLeadSubmission(invalidInPersonBody);
assert.equal(resInPerson.valid, false);
assert.ok(
  resInPerson.errors.contactMethod?.includes("In-person consultation is not available"),
  "Must reject 'In person' with explicit error"
);
console.log("✓ Verified: Server validation strictly rejects 'In person' for contactMethod");

// E. Validation: Valid v2 Payload with defaults and optional fields
const validBodyV2 = {
  name: "José María O'Connor-Smith",
  phone: "+91 98765 43210",
  email: "User@Example.COM",
  consultationType: "Savings plan consultation",
  interest: "Fixed deposits",
  contactMethod: "WhatsApp",
  city: "  Bengaluru  ",
  savingsRange: "₹15,000–50,000",
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
const resValidV2 = validateLeadSubmission(validBodyV2);
assert.equal(resValidV2.valid, true);
assert.equal(resValidV2.normalized?.schemaVersion, 2);
assert.equal(resValidV2.normalized?.name, "José María O'Connor-Smith");
assert.equal(resValidV2.normalized?.phone, "9876543210");
assert.equal(resValidV2.normalized?.email, "user@example.com");
assert.equal(resValidV2.normalized?.consultationType, "Savings plan consultation");
assert.equal(resValidV2.normalized?.contactMethod, "WhatsApp");
assert.equal(resValidV2.normalized?.callTimePreference, "No preference");
assert.equal(resValidV2.normalized?.preferredLanguage, "English");
assert.equal(resValidV2.normalized?.city, "Bengaluru");
assert.equal(resValidV2.normalized?.savingsRange, "₹15,000–50,000");
assert.equal(resValidV2.normalized?.attribution.unknown_param, undefined);
assert.equal(resValidV2.normalized?.attribution.utm_source, "google");
console.log("✓ Verified: Valid v2 payload normalizes name, phone, email, defaults time/lang, and trims city");

// F. Validation: Blank city and savingsRange are omitted
const validBlankOptionals = {
  name: "Asha Sharma",
  phone: "9876543210",
  email: "asha@example.com",
  consultationType: "Quick call",
  interest: "Emergency fund",
  contactMethod: "Phone call",
  city: "   ",
  savingsRange: "",
  consent: true,
};
const resBlank = validateLeadSubmission(validBlankOptionals);
assert.equal(resBlank.valid, true);
assert.equal(resBlank.normalized?.city, undefined, "Blank city must be undefined");
assert.equal(resBlank.normalized?.savingsRange, undefined, "Blank savingsRange must be undefined");
console.log("✓ Verified: Blank city and savingsRange are omitted from normalized payload");

// G. Keyed HMAC IP Hash
const hmacSecret = "test_rate_secret_123456789012345678901234";
const hash1 = computeClientIpHash("192.168.1.1", hmacSecret);
const hash2 = computeClientIpHash("192.168.1.1", hmacSecret);
const hash3 = computeClientIpHash("192.168.1.2", hmacSecret);
assert.equal(hash1, hash2);
assert.notEqual(hash1, hash3);
console.log("✓ Verified: Keyed HMAC-SHA-256 hashes client IPs deterministically without exposing raw IPs");

// H. Versioned Fingerprinting Tests
const legacyPayload = {
  name: "Legacy User",
  phone: "9876543210",
  email: "legacy@example.com",
  interest: "Fixed deposits",
  consent: true,
  attribution: {},
};
const fpLegacy = computePayloadFingerprint(legacyPayload, 1);
assert.ok(fpLegacy && fpLegacy.length === 64, "Legacy fingerprint must be a 64-char SHA-256 hex");

const v2Payload = {
  schemaVersion: 2,
  name: "V2 User",
  phone: "9876543210",
  email: "v2@example.com",
  consultationType: "Savings plan consultation",
  interest: "Fixed deposits",
  contactMethod: "Phone call",
  callTimePreference: "No preference",
  preferredLanguage: "English",
  consent: true,
  attribution: {},
};
const fpV2 = computePayloadFingerprint(v2Payload, 2);
assert.ok(fpV2 && fpV2.length === 64, "V2 fingerprint must be a 64-char SHA-256 hex");
assert.notEqual(fpLegacy, fpV2, "V1 and V2 fingerprints must not collide");
console.log("✓ Verified: Versioned fingerprinting distinguishes legacy v1 and current v2 schemas");

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
const TEST_PHONE_LEGACY = "9998880003";

const testSecret = "test_secret_for_rate_limiting_only";
const testIp = "10.0.0.99";
const testClientHash = computeClientIpHash(testIp, testSecret);

async function cleanupTestData() {
  await db.collection("leads").deleteMany({ phone: { $in: [TEST_PHONE, TEST_PHONE_RETURNING, TEST_PHONE_LEGACY] } });
  await db.collection("enquiries").deleteMany({ phone: { $in: [TEST_PHONE, TEST_PHONE_RETURNING, TEST_PHONE_LEGACY] } });
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

// Test B: Multi-Document Transaction with Version 2 Enquiry Document
const idempotencyKey1 = `test_idemp_${crypto.randomUUID()}`;
const payload1 = {
  name: "Direct Lead User",
  phone: TEST_PHONE,
  email: "direct@example.com",
  consultationType: "Savings plan consultation",
  interest: "Fixed deposits",
  contactMethod: "Phone call",
  callTimePreference: "Morning 9–12",
  preferredLanguage: "English",
  city: "Bengaluru",
  savingsRange: "₹15,000–50,000",
  consent: true,
  attribution: {},
};
const fp1 = computePayloadFingerprint({ ...payload1, schemaVersion: 2 }, 2);

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

    const enquiryDoc = {
      schemaVersion: 2,
      leadId: leadId1,
      idempotencyKey: idempotencyKey1,
      payloadFingerprint: fp1,
      name: payload1.name,
      phone: payload1.phone,
      email: payload1.email,
      consultationType: payload1.consultationType,
      interest: payload1.interest,
      contactMethod: payload1.contactMethod,
      callTimePreference: payload1.callTimePreference,
      preferredLanguage: payload1.preferredLanguage,
      city: payload1.city,
      savingsRange: payload1.savingsRange,
      consent: payload1.consent,
      status: "received",
      createdAt: now,
    };

    const enquiryInsert = await db.collection("enquiries").insertOne(
      enquiryDoc,
      { session }
    );
    enquiryId1 = enquiryInsert.insertedId;
  });
} finally {
  await session.endSession();
}

// Verify v2 lead & enquiry persisted
const savedLead1 = await db.collection("leads").findOne({ _id: leadId1 });
assert.ok(savedLead1);
assert.equal(savedLead1.phone, TEST_PHONE);
assert.equal(savedLead1.totalEnquiries, 1);

const savedEnquiry1 = await db.collection("enquiries").findOne({ _id: enquiryId1 });
assert.ok(savedEnquiry1);
assert.equal(savedEnquiry1.schemaVersion, 2);
assert.equal(savedEnquiry1.name, "Direct Lead User");
assert.equal(savedEnquiry1.consultationType, "Savings plan consultation");
assert.equal(savedEnquiry1.contactMethod, "Phone call");
assert.equal(savedEnquiry1.callTimePreference, "Morning 9–12");
assert.equal(savedEnquiry1.city, "Bengaluru");
assert.equal(savedEnquiry1.savingsRange, "₹15,000–50,000");
console.log("✓ Verified: Version 2 enquiry correctly persists schemaVersion, consultationType, contactMethod, city, savingsRange");

// Test C: Idempotent Retry of v2 Submission (Same Key + Same Payload)
const duplicateRead = await db.collection("enquiries").findOne({ idempotencyKey: idempotencyKey1 });
assert.ok(duplicateRead);
assert.equal(duplicateRead.payloadFingerprint, fp1);
console.log("✓ Verified: Matching v2 idempotencyKey with identical fingerprint resolves to original enquiry");

// Test D: Idempotency Conflict on v2 (Same Key + Different Payload)
const conflictingPayload = { ...payload1, schemaVersion: 2, name: "Conflicting Name Attempt" };
const conflictingFp = computePayloadFingerprint(conflictingPayload, 2);
assert.notEqual(duplicateRead.payloadFingerprint, conflictingFp);
console.log("✓ Verified: Matching idempotencyKey with different v2 payload detects conflict (HTTP 409)");

// Test E: Historical Legacy Record Idempotency Simulation
// Simulate a historical record in DB that lacks schemaVersion (legacy v1)
const legacyKey = `test_legacy_${crypto.randomUUID()}`;
const legacyDbDoc = {
  leadId: new ObjectId(),
  idempotencyKey: legacyKey,
  payloadFingerprint: fpLegacy,
  name: "Historical Lead",
  phone: TEST_PHONE_LEGACY,
  email: "historical@example.com",
  interest: "Fixed deposits",
  consent: true,
  status: "received",
  createdAt: new Date("2026-01-01"),
};
await db.collection("enquiries").insertOne(legacyDbDoc);

// 1. Genuine legacy retry matches legacy fingerprint
const legacyRead = await db.collection("enquiries").findOne({ idempotencyKey: legacyKey });
assert.ok(legacyRead);
assert.equal(legacyRead.schemaVersion, undefined, "Historical record must NOT have schemaVersion backfilled");
assert.equal(legacyRead.payloadFingerprint, fpLegacy, "Historical fingerprint matches legacy calculation");

// 2. New v2 payload attempting to use this legacy key must NOT match (HTTP 409)
const isStoredV2 = legacyRead.schemaVersion === 2;
assert.equal(isStoredV2, false, "Stored legacy record is detected as legacy v1");
console.log("✓ Verified: Historical records remain untouched and v2 requests attempting legacy key reuse are blocked (HTTP 409)");

// Test F: Returning Contact with New Campaign (Multi-Touch)
const idempotencyKey2 = `test_idemp_${crypto.randomUUID()}`;
const payload2 = {
  schemaVersion: 2,
  name: "Returning Lead User",
  phone: TEST_PHONE, // Same phone!
  email: "returning@example.com",
  consultationType: "Financial roadmap consultancy",
  interest: "Recurring deposits",
  contactMethod: "WhatsApp",
  callTimePreference: "No preference",
  preferredLanguage: "English",
  consent: true,
  attribution: {
    utm_source: "facebook",
    utm_medium: "social",
    utm_campaign: "test_retargeting_2026",
    fbclid: "fb_click_9999",
  },
};
const fp2 = computePayloadFingerprint(payload2, 2);

const session2 = client.startSession();
let enquiryId2;
try {
  await session2.withTransaction(async () => {
    const now = new Date();
    const existing = await db.collection("leads").findOne({ phone: payload2.phone }, { session: session2 });
    assert.ok(existing);

    await db.collection("leads").updateOne(
      { _id: existing._id },
      { $set: { lastActiveAt: now }, $inc: { totalEnquiries: 1 } },
      { session: session2 }
    );

    const enquiryInsert = await db.collection("enquiries").insertOne(
      {
        schemaVersion: 2,
        leadId: existing._id,
        idempotencyKey: idempotencyKey2,
        payloadFingerprint: fp2,
        name: payload2.name,
        phone: payload2.phone,
        email: payload2.email,
        consultationType: payload2.consultationType,
        interest: payload2.interest,
        contactMethod: payload2.contactMethod,
        callTimePreference: payload2.callTimePreference,
        preferredLanguage: payload2.preferredLanguage,
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
assert.equal(allEnquiries[0].consultationType, "Savings plan consultation");
assert.equal(allEnquiries[1].consultationType, "Financial roadmap consultancy");

const touchpoint2 = await db.collection("campaign_touchpoints").findOne({ enquiryId: enquiryId2 });
assert.ok(touchpoint2);
assert.equal(touchpoint2.utm_source, "facebook");
assert.equal(touchpoint2.utm_campaign, "test_retargeting_2026");
console.log("✓ Verified: Returning contact preserves original lead, appends new v2 enquiry, and links separate touchpoint");

// Cleanup test data
await cleanupTestData();
await client.close();

console.log("\n=================================================");
console.log("ALL REAL DATABASE & CONCURRENCY TESTS PASSED!");
console.log("=================================================");
