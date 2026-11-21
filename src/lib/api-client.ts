import { clearStoredAttribution, UtmAttribution } from "./utm";

export interface LeadSubmissionData {
  name: string;
  phone: string;
  email: string;
  interest: string;
  consent: boolean;
  website?: string;
  attribution?: UtmAttribution;
}

export interface SubmissionSnapshot {
  idempotencyKey: string;
  payload: LeadSubmissionData;
}

export interface ApiResponseSuccess {
  success: true;
  enquiryId: string;
  message: string;
}

export interface ApiResponseFailure {
  success: false;
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export type ApiSubmissionResult = ApiResponseSuccess | ApiResponseFailure;

/**
 * Generates a standard UUID v4 string.
 */
export function generateUuidV4(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Creates an immutable submission snapshot with a fresh idempotency key.
 */
export function createSubmissionSnapshot(
  data: LeadSubmissionData
): SubmissionSnapshot {
  return {
    idempotencyKey: generateUuidV4(),
    payload: {
      name: data.name,
      phone: data.phone,
      email: data.email,
      interest: data.interest,
      consent: data.consent,
      website: data.website || "",
      attribution: data.attribution ? { ...data.attribution } : {},
    },
  };
}

/**
 * Submits the lead consultation request snapshot to the Next.js API route.
 *
 * Implements bounded timeout (8000ms), envelope validation, and safe
 * attribution cleanup only on verified HTTP 201 or 200 success.
 */
export async function submitLeadSnapshot(
  snapshot: SubmissionSnapshot,
  timeoutMs = 8000
): Promise<ApiSubmissionResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": snapshot.idempotencyKey,
      },
      body: JSON.stringify({
        ...snapshot.payload,
        requestId: snapshot.idempotencyKey,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return {
        success: false,
        code: "INVALID_RESPONSE",
        message: "Received an unparseable response from the server. Please retry.",
      };
    }

    if (!json || typeof json !== "object") {
      return {
        success: false,
        code: "INVALID_RESPONSE",
        message: "Invalid response format received from server.",
      };
    }

    const envelope = json as {
      success?: boolean;
      data?: { enquiryId?: string; message?: string };
      error?: { code?: string; message?: string; fields?: Record<string, string> };
    };

    // Both 201 (initial write) and 200 (idempotent retry) represent valid success
    if ((res.status === 201 || res.status === 200) && envelope.success === true) {
      const enquiryId = envelope.data?.enquiryId;
      const message =
        envelope.data?.message ||
        `Thank you, ${snapshot.payload.name}. Your consultation request has been received.`;

      if (enquiryId && typeof enquiryId === "string") {
        // Clear consumed session attribution safely without erasing newer in-flight campaigns
        clearStoredAttribution(snapshot.payload.attribution || null);

        return {
          success: true,
          enquiryId,
          message,
        };
      }
    }

    // Specific error mapping
    return {
      success: false,
      code: envelope.error?.code || "SUBMISSION_FAILED",
      message:
        envelope.error?.message ||
        "Unable to complete your request. Please review the form and try again.",
      fields: envelope.error?.fields,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof Error && err.name === "AbortError") {
      return {
        success: false,
        code: "TIMEOUT",
        message:
          "The request took too long to complete. Please check your connection and retry.",
      };
    }

    return {
      success: false,
      code: "NETWORK_ERROR",
      message:
        "Unable to connect to the server. Please check your internet connection and retry.",
    };
  }
}
