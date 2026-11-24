# K2WFINANCE — Backend API Integration & Architecture Handoff

## 1. Overview & Current Status
- **Active Branch:** `preview/k2wfinance`
- **Frontend Form Mode:** Live consultation request form (`#lead-form`) connected to same-origin `POST /api/leads`.
- **API Version:** Schema Version 2.
- **Idempotency:** Client-generated UUID v4 sent via `Idempotency-Key` header and matched against body `requestId`.
- **Protection:** Trusted origin verification, payload bound (16KB), honeypot (`website`), atomic fixed-window rate limiting with keyed HMAC client IP hashing.
- **Persistence:** MongoDB multi-document transaction linking phone-grouped `leads`, immutable `enquiries`, and `campaign_touchpoints`.

---

## 2. API Contract Specification (`POST /api/leads`)

### Request Headers
```http
Content-Type: application/json
Idempotency-Key: <UUID-v4>
```

### Request Payload Schema (Version 2)
```json
{
  "requestId": "string (UUID v4, must match Idempotency-Key header)",
  "name": "string (2–80 chars, Unicode allowed)",
  "phone": "string (normalized 10-digit Indian mobile, starts with 6–9)",
  "email": "string (valid email, max 254 chars, lowercased)",
  "consultationType": "Quick call | Savings plan consultation | Financial roadmap consultancy",
  "interest": "one of 16 approved GoalInterests",
  "contactMethod": "Phone call | WhatsApp | Video call (Note: 'In person' is strictly rejected with 400)",
  "callTimePreference": "No preference | Morning 9–12 | Afternoon 12–4 | Evening 4–8 (optional, default: 'No preference')",
  "preferredLanguage": "English | Hindi | Kannada | Other (optional, default: 'English')",
  "city": "string (optional, max 80 chars, omitted if blank)",
  "savingsRange": "Under ₹5,000 | ₹5,000–15,000 | ₹15,000–50,000 | ₹50,000+ | Prefer not to say (optional, omitted if blank)",
  "consent": true,
  "website": "string (honeypot, must be empty)",
  "attribution": {
    "utm_source": "string (optional)",
    "utm_medium": "string (optional)",
    "utm_campaign": "string (optional)",
    "utm_content": "string (optional)",
    "utm_term": "string (optional)",
    "gclid": "string (optional)",
    "fbclid": "string (optional)"
  }
}
```

### Success Response Envelope (HTTP 201 Created / HTTP 200 OK)
```json
{
  "success": true,
  "data": {
    "enquiryId": "673f...",
    "message": "Thank you, [Name]. Your consultation request has been received."
  }
}
```

### Error Response Envelope (HTTP 400, 403, 409, 413, 415, 429, 500)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED | IDEMPOTENCY_CONFLICT | FORBIDDEN_ORIGIN | RATE_LIMIT_EXCEEDED",
    "message": "Human-readable description",
    "fields": {
      "fieldName": "Specific validation error message"
    }
  }
}
```

---

## 3. Database Collection Architecture

### A. `leads` Collection (Phone-Grouped Contact Summary)
Records initial contact identity and tracks activity across submissions:
```json
{
  "_id": "ObjectId",
  "phone": "9876543210",
  "name": "User Name",
  "email": "user@example.com",
  "firstSeenAt": "ISODate",
  "lastActiveAt": "ISODate",
  "totalEnquiries": 1
}
```

### B. `enquiries` Collection (Immutable Submission Records)
Every consultation request is persisted with its submitted details and explicit version tag:
```json
{
  "_id": "ObjectId",
  "schemaVersion": 2,
  "leadId": "ObjectId",
  "idempotencyKey": "UUID-v4",
  "payloadFingerprint": "SHA-256 hex string",
  "name": "User Name",
  "phone": "9876543210",
  "email": "user@example.com",
  "consultationType": "Savings plan consultation",
  "interest": "Fixed deposits",
  "contactMethod": "Phone call",
  "callTimePreference": "No preference",
  "preferredLanguage": "English",
  "city": "Bengaluru",
  "savingsRange": "₹15,000–50,000",
  "consent": true,
  "status": "received",
  "createdAt": "ISODate"
}
```

### C. `campaign_touchpoints` Collection (Attribution Records)
Persisted only when attribution keys are present:
```json
{
  "_id": "ObjectId",
  "leadId": "ObjectId",
  "enquiryId": "ObjectId",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "monsoon_2026",
  "landingPath": "/",
  "createdAt": "ISODate"
}
```

---

## 4. Versioned Idempotency & Legacy Compatibility Rules
1. **Historical Records:** Legacy records written under schema version 1 lack `schemaVersion` and new consultation preference fields.
2. **Zero Invalidation:** When an enquiry lookup matches an existing legacy record:
   - If retried with genuine legacy fields, it is validated against the Version 1 fingerprint and returns the original `200 OK`.
   - If submitted with new Version 2 consultation fields, it is rejected with `409 Conflict` (preventing cross-schema key collision).
3. **Version 2 Retries:** Stored records with `schemaVersion: 2` are matched against the canonical Version 2 fingerprint. Matching payloads return `200 OK`; differing payloads return `409 Conflict`.
4. **Historical Isolation:** Historical records are never modified, rewritten, or backfilled. Missing historical consultation details are read as `undefined` / "Not recorded".

---

## 5. Separate Dashboard Compatibility Notes
For the separate `k2wfinance-leads-dashboard` repository (read-only reference):
- It can read `enquiries` documents and safely display fallback values for older records:
  - `consultationType`: displays submitted type, or falls back to `"Not recorded"` for legacy records.
  - `contactMethod`: displays submitted method, or falls back to `"Not recorded"` for legacy records.
  - `callTimePreference` & `preferredLanguage`: displays value or falls back to `"Not recorded"`.
  - `city` & `savingsRange`: displays value when present.
- The dashboard repository requires zero modifications for the marketing website deployment.
