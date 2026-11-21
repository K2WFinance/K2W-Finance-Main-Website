import crypto from "node:crypto";

export type GoalInterest =
  | "Gifts on special days"
  | "Start your own business"
  | "Pay off your loans"
  | "Emergency fund"
  | "Education & family"
  | "Your own home"
  | "A new vehicle"
  | "Grow your wealth"
  | "Travel & personal dreams"
  | "Enjoy peace of mind"
  | "Monthly expenses"
  | "Retirement"
  | "Fixed deposits"
  | "Recurring deposits"
  | "Monthly income plans"
  | "I need help deciding";

export const ALLOWED_INTERESTS: readonly GoalInterest[] = [
  "Gifts on special days",
  "Start your own business",
  "Pay off your loans",
  "Emergency fund",
  "Education & family",
  "Your own home",
  "A new vehicle",
  "Grow your wealth",
  "Travel & personal dreams",
  "Enjoy peace of mind",
  "Monthly expenses",
  "Retirement",
  "Fixed deposits",
  "Recurring deposits",
  "Monthly income plans",
  "I need help deciding",
] as const;

export const ALLOWED_ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
] as const;

export type AllowedAttributionKey = (typeof ALLOWED_ATTRIBUTION_KEYS)[number];

export interface LeadAttributionInput {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  fbclid?: string;
  [key: string]: string | undefined;
}

export interface LeadSubmissionInput {
  requestId?: string;
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  interest?: unknown;
  consent?: unknown;
  website?: unknown;
  attribution?: unknown;
  [key: string]: unknown;
}

export interface NormalizedLeadPayload {
  name: string;
  phone: string;
  email: string;
  interest: GoalInterest;
  consent: boolean;
  attribution: Record<string, string>;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  normalized?: NormalizedLeadPayload;
}

/**
 * Normalizes an Indian phone number to 10 digits.
 * Strips whitespace, hyphens, parentheses, and leading +91 / 0091 / 0 prefixes.
 */
export function normalizeIndianPhone(raw: string): string {
  const cleaned = raw.replace(/[\s()-]/g, "").replace(/^(\+91|0091|0)/, "");
  return cleaned;
}

/**
 * Validates a lead submission payload against strict server rules.
 * Rejects unknown top-level fields, enforces string boundaries, Unicode name regex,
 * Indian phone normalization, and allowlisted interest selections.
 */
export function validateLeadSubmission(
  body: unknown,
  allowedKnownFields: readonly string[] = [
    "requestId",
    "name",
    "phone",
    "email",
    "interest",
    "consent",
    "website",
    "attribution",
  ]
): ValidationResult {
  const errors: Record<string, string> = {};

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      valid: false,
      errors: { body: "Invalid request payload format." },
    };
  }

  const record = body as Record<string, unknown>;

  // Reject unexpected unknown body keys
  for (const key of Object.keys(record)) {
    if (!allowedKnownFields.includes(key)) {
      errors[key] = `Unknown field "${key}" is not permitted.`;
    }
  }

  // 1. Name validation
  let normalizedName = "";
  if (typeof record.name !== "string") {
    errors.name = "Full name is required.";
  } else {
    normalizedName = record.name.trim();
    if (
      !/^[\p{L}\p{M}][\p{L}\p{M} .’'’-]*$/u.test(normalizedName) ||
      normalizedName.length < 2 ||
      normalizedName.length > 80
    ) {
      errors.name = "Enter a name with 2–80 characters.";
    }
  }

  // 2. Phone validation
  let normalizedPhone = "";
  if (typeof record.phone !== "string") {
    errors.phone = "Phone number is required.";
  } else {
    normalizedPhone = normalizeIndianPhone(record.phone.trim());
    if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
      errors.phone = "Enter a valid 10-digit Indian mobile number.";
    }
  }

  // 3. Email validation
  let normalizedEmail = "";
  if (typeof record.email !== "string") {
    errors.email = "Email address is required.";
  } else {
    normalizedEmail = record.email.trim().toLowerCase();
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizedEmail) ||
      normalizedEmail.length > 254
    ) {
      errors.email = "Enter a valid email address.";
    }
  }

  // 4. Interest validation
  let normalizedInterest: GoalInterest | null = null;
  if (typeof record.interest !== "string") {
    errors.interest = "Choose a goal for your consultation.";
  } else {
    const rawInterest = record.interest.trim();
    if (!ALLOWED_INTERESTS.includes(rawInterest as GoalInterest)) {
      errors.interest = "Choose a goal for your consultation.";
    } else {
      normalizedInterest = rawInterest as GoalInterest;
    }
  }

  // 5. Consent validation
  if (record.consent !== true) {
    errors.consent = "Please agree to be contacted regarding your consultation.";
  }

  // 6. Attribution validation (optional, strictly allowlisted)
  const normalizedAttribution: Record<string, string> = {};
  if (record.attribution !== undefined && record.attribution !== null) {
    if (typeof record.attribution !== "object" || Array.isArray(record.attribution)) {
      errors.attribution = "Attribution must be an object.";
    } else {
      const attrRecord = record.attribution as Record<string, unknown>;
      for (const [key, val] of Object.entries(attrRecord)) {
        if (
          ALLOWED_ATTRIBUTION_KEYS.includes(key as AllowedAttributionKey) &&
          typeof val === "string"
        ) {
          const trimmed = val.trim();
          if (trimmed) {
            normalizedAttribution[key] = trimmed.slice(0, 200);
          }
        }
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    normalized: {
      name: normalizedName,
      phone: normalizedPhone,
      email: normalizedEmail,
      interest: normalizedInterest!,
      consent: true,
      attribution: normalizedAttribution,
    },
  };
}

/**
 * Creates a deterministic, canonical JSON string by sorting all keys recursively.
 */
export function canonicalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return `[${obj.map(canonicalizeJson).join(",")}]`;
  }

  const sortedKeys = Object.keys(obj as Record<string, unknown>).sort();
  const entries = sortedKeys.map(
    (key) =>
      `${JSON.stringify(key)}:${canonicalizeJson(
        (obj as Record<string, unknown>)[key]
      )}`
  );
  return `{${entries.join(",")}}`;
}

/**
 * Computes a SHA-256 fingerprint of the normalized canonical payload.
 */
export function computePayloadFingerprint(payload: NormalizedLeadPayload): string {
  const canonicalString = canonicalizeJson({
    name: payload.name,
    phone: payload.phone,
    email: payload.email,
    interest: payload.interest,
    consent: payload.consent,
    attribution: payload.attribution,
  });

  return crypto.createHash("sha256").update(canonicalString).digest("hex");
}
