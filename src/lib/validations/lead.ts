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

export type ConsultationType =
  | "Quick call"
  | "Savings plan consultation"
  | "Financial roadmap consultancy";

export const ALLOWED_CONSULTATION_TYPES: readonly ConsultationType[] = [
  "Quick call",
  "Savings plan consultation",
  "Financial roadmap consultancy",
] as const;

export type ContactMethod = "Phone call" | "WhatsApp" | "Video call";

export const ALLOWED_CONTACT_METHODS: readonly ContactMethod[] = [
  "Phone call",
  "WhatsApp",
  "Video call",
] as const;

export type CallTimePreference =
  | "No preference"
  | "Morning 9–12"
  | "Afternoon 12–4"
  | "Evening 4–8";

export const ALLOWED_CALL_TIME_PREFERENCES: readonly CallTimePreference[] = [
  "No preference",
  "Morning 9–12",
  "Afternoon 12–4",
  "Evening 4–8",
] as const;

export type PreferredLanguage = "English" | "Hindi" | "Kannada" | "Other";

export const ALLOWED_PREFERRED_LANGUAGES: readonly PreferredLanguage[] = [
  "English",
  "Hindi",
  "Kannada",
  "Other",
] as const;

export type SavingsRange =
  | "Under ₹5,000"
  | "₹5,000–15,000"
  | "₹15,000–50,000"
  | "₹50,000+"
  | "Prefer not to say";

export const ALLOWED_SAVINGS_RANGES: readonly SavingsRange[] = [
  "Under ₹5,000",
  "₹5,000–15,000",
  "₹15,000–50,000",
  "₹50,000+",
  "Prefer not to say",
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
  consultationType?: unknown;
  interest?: unknown;
  contactMethod?: unknown;
  callTimePreference?: unknown;
  preferredLanguage?: unknown;
  city?: unknown;
  savingsRange?: unknown;
  consent?: unknown;
  website?: unknown;
  attribution?: unknown;
  [key: string]: unknown;
}

export interface NormalizedLeadPayload {
  schemaVersion: 2;
  name: string;
  phone: string;
  email: string;
  consultationType: ConsultationType;
  interest: GoalInterest;
  contactMethod: ContactMethod;
  callTimePreference: CallTimePreference;
  preferredLanguage: PreferredLanguage;
  city?: string;
  savingsRange?: SavingsRange;
  consent: boolean;
  attribution: Record<string, string>;
}

export interface NormalizedLegacyLeadPayload {
  schemaVersion?: 1;
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

export const ALLOWED_KNOWN_FIELDS: readonly string[] = [
  "requestId",
  "name",
  "phone",
  "email",
  "consultationType",
  "interest",
  "contactMethod",
  "callTimePreference",
  "preferredLanguage",
  "city",
  "savingsRange",
  "consent",
  "website",
  "attribution",
] as const;

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
 * Indian phone normalization, enum allowlists, and rejects removed "In person".
 */
export function validateLeadSubmission(
  body: unknown,
  allowedKnownFields: readonly string[] = ALLOWED_KNOWN_FIELDS
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

  // 4. Consultation Type validation
  let normalizedConsultationType: ConsultationType | null = null;
  if (typeof record.consultationType !== "string") {
    errors.consultationType = "Choose a type of consultation.";
  } else {
    const rawType = record.consultationType.trim();
    if (!ALLOWED_CONSULTATION_TYPES.includes(rawType as ConsultationType)) {
      errors.consultationType = "Choose a valid type of consultation.";
    } else {
      normalizedConsultationType = rawType as ConsultationType;
    }
  }

  // 5. Interest validation
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

  // 6. Contact Method validation (Explicitly reject "In person")
  let normalizedContactMethod: ContactMethod | null = null;
  if (typeof record.contactMethod !== "string") {
    errors.contactMethod = "Select your preferred contact method.";
  } else {
    const rawMethod = record.contactMethod.trim();
    if (rawMethod === "In person") {
      errors.contactMethod =
        "In-person consultation is not available. Please choose Phone call, WhatsApp, or Video call.";
    } else if (!ALLOWED_CONTACT_METHODS.includes(rawMethod as ContactMethod)) {
      errors.contactMethod = "Select a valid preferred contact method.";
    } else {
      normalizedContactMethod = rawMethod as ContactMethod;
    }
  }

  // 7. Call Time Preference validation (Optional, defaults to "No preference")
  let normalizedCallTime: CallTimePreference = "No preference";
  if (record.callTimePreference !== undefined && record.callTimePreference !== null && record.callTimePreference !== "") {
    if (typeof record.callTimePreference !== "string") {
      errors.callTimePreference = "Invalid best time to call option.";
    } else {
      const rawTime = record.callTimePreference.trim();
      if (!ALLOWED_CALL_TIME_PREFERENCES.includes(rawTime as CallTimePreference)) {
        errors.callTimePreference = "Choose a valid call time preference.";
      } else {
        normalizedCallTime = rawTime as CallTimePreference;
      }
    }
  }

  // 8. Preferred Language validation (Optional, defaults to "English")
  let normalizedLanguage: PreferredLanguage = "English";
  if (record.preferredLanguage !== undefined && record.preferredLanguage !== null && record.preferredLanguage !== "") {
    if (typeof record.preferredLanguage !== "string") {
      errors.preferredLanguage = "Invalid preferred language option.";
    } else {
      const rawLang = record.preferredLanguage.trim();
      if (!ALLOWED_PREFERRED_LANGUAGES.includes(rawLang as PreferredLanguage)) {
        errors.preferredLanguage = "Choose a valid preferred language.";
      } else {
        normalizedLanguage = rawLang as PreferredLanguage;
      }
    }
  }

  // 9. City validation (Optional, max 80 chars, omitted if blank)
  let normalizedCity: string | undefined = undefined;
  if (record.city !== undefined && record.city !== null) {
    if (typeof record.city !== "string") {
      errors.city = "City must be a text value.";
    } else {
      const trimmedCity = record.city.trim();
      if (trimmedCity.length > 80) {
        errors.city = "City must be 80 characters or fewer.";
      } else if (trimmedCity.length > 0) {
        normalizedCity = trimmedCity;
      }
    }
  }

  // 10. Savings Range validation (Optional, allowlisted, omitted if blank)
  let normalizedSavingsRange: SavingsRange | undefined = undefined;
  if (record.savingsRange !== undefined && record.savingsRange !== null && record.savingsRange !== "") {
    if (typeof record.savingsRange !== "string") {
      errors.savingsRange = "Invalid savings range option.";
    } else {
      const rawRange = record.savingsRange.trim();
      if (!ALLOWED_SAVINGS_RANGES.includes(rawRange as SavingsRange)) {
        errors.savingsRange = "Choose a valid savings range.";
      } else {
        normalizedSavingsRange = rawRange as SavingsRange;
      }
    }
  }

  // 11. Consent validation
  if (record.consent !== true) {
    errors.consent = "Please agree to be contacted regarding your consultation.";
  }

  // 12. Attribution validation (optional, strictly allowlisted)
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
      schemaVersion: 2,
      name: normalizedName,
      phone: normalizedPhone,
      email: normalizedEmail,
      consultationType: normalizedConsultationType!,
      interest: normalizedInterest!,
      contactMethod: normalizedContactMethod!,
      callTimePreference: normalizedCallTime,
      preferredLanguage: normalizedLanguage,
      city: normalizedCity,
      savingsRange: normalizedSavingsRange,
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
 *
 * Version 1 (Legacy): { name, phone, email, interest, consent, attribution }
 * Version 2 (Current): Includes all consultation, contact preferences, and optional fields.
 */
export function computePayloadFingerprint(
  payload: NormalizedLeadPayload | NormalizedLegacyLeadPayload,
  version: 1 | 2 = 2
): string {
  if (version === 1) {
    const canonicalString = canonicalizeJson({
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      interest: payload.interest,
      consent: payload.consent,
      attribution: payload.attribution || {},
    });
    return crypto.createHash("sha256").update(canonicalString).digest("hex");
  }

  const v2 = payload as NormalizedLeadPayload;
  const canonicalData: Record<string, unknown> = {
    schemaVersion: 2,
    name: v2.name,
    phone: v2.phone,
    email: v2.email,
    consultationType: v2.consultationType,
    interest: v2.interest,
    contactMethod: v2.contactMethod,
    callTimePreference: v2.callTimePreference,
    preferredLanguage: v2.preferredLanguage,
    consent: v2.consent,
    attribution: v2.attribution || {},
  };

  if (v2.city !== undefined && v2.city !== "") {
    canonicalData.city = v2.city;
  }
  if (v2.savingsRange !== undefined) {
    canonicalData.savingsRange = v2.savingsRange;
  }

  const canonicalString = canonicalizeJson(canonicalData);
  return crypto.createHash("sha256").update(canonicalString).digest("hex");
}
