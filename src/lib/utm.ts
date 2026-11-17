/**
 * Isolated K2WFINANCE UTM attribution utility.
 *
 * Current Status: Active collection is DISABLED until K2WFINANCE approves an explicit allowlist.
 * No advertising cookies or PII are captured or stored.
 */

export const STORAGE_KEY = "k2wfinance_attribution_v1";
export const MAX_PARAM_LENGTH = 200;

// Explicit flag: active capture is disabled pending client confirmation
export const UTM_COLLECTION_ENABLED = false;

// Tentative allowlist structure for future client approval.
// Empty until explicitly approved by the K2WFINANCE project lead.
export const APPROVED_UTM_ALLOWLIST: readonly string[] = [] as const;

export interface UtmAttribution {
  [key: string]: string;
}

/**
 * Sanitizes an attribution value: trims and enforces max length.
 */
export function sanitizeValue(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_PARAM_LENGTH);
}

/**
 * Parses query parameters from a search string against an approved allowlist.
 */
export function extractAllowlistedParams(
  searchString: string,
  allowlist: readonly string[] = APPROVED_UTM_ALLOWLIST
): UtmAttribution {
  if (!searchString || allowlist.length === 0) return {};

  try {
    const params = new URLSearchParams(searchString);
    const attribution: UtmAttribution = {};

    for (const key of allowlist) {
      const val = params.get(key);
      const sanitized = sanitizeValue(val);
      if (sanitized) {
        attribution[key] = sanitized;
      }
    }

    return attribution;
  } catch {
    return {};
  }
}

/**
 * Safely reads stored attribution from sessionStorage.
 * If data is corrupted, clears it and returns null without throwing.
 */
export function getStoredAttribution(): UtmAttribution | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    // Return sanitized object
    const sanitized: UtmAttribution = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string") {
        const cleanVal = sanitizeValue(v);
        if (cleanVal) sanitized[k] = cleanVal;
      }
    }
    return Object.keys(sanitized).length > 0 ? sanitized : null;
  } catch {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore sessionStorage access errors
    }
    return null;
  }
}

/**
 * Safely stores attribution in sessionStorage.
 */
export function setStoredAttribution(attribution: UtmAttribution): boolean {
  if (typeof window === "undefined") return false;
  if (!attribution || Object.keys(attribution).length === 0) return false;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
    return true;
  } catch {
    return false;
  }
}

/**
 * Clears stored attribution after verified real API success only.
 * Demo form validation must NEVER invoke this.
 */
export function clearStoredAttribution(): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failure
  }
}

/**
 * Captures landing attribution on page mount.
 * Returns null immediately if collection is disabled.
 */
export function captureLandingAttribution(): UtmAttribution | null {
  if (!UTM_COLLECTION_ENABLED || typeof window === "undefined") {
    return null;
  }

  const liveParams = extractAllowlistedParams(window.location.search);
  if (Object.keys(liveParams).length > 0) {
    setStoredAttribution(liveParams);
    return liveParams;
  }

  return getStoredAttribution();
}

/**
 * Retrieves attribution for form submission:
 * Live URL values take priority; stored session attribution is used as fallback.
 */
export function getAttributionForSubmission(): UtmAttribution | null {
  if (!UTM_COLLECTION_ENABLED || typeof window === "undefined") {
    return null;
  }

  const liveParams = extractAllowlistedParams(window.location.search);
  if (Object.keys(liveParams).length > 0) {
    return liveParams;
  }

  return getStoredAttribution();
}
