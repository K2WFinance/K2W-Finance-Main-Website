/**
 * Isolated K2WFINANCE UTM attribution utility.
 *
 * Current Status: Active collection is ENABLED with the approved 7-field allowlist.
 * No advertising cookies or PII are captured or stored.
 */

export const STORAGE_KEY = "k2wfinance_attribution_v1";
export const MAX_PARAM_LENGTH = 200;

// Active capture is ENABLED per approved specification
export const UTM_COLLECTION_ENABLED = true;

// Approved URL tracking allowlist (7 parameters)
export const APPROVED_UTM_ALLOWLIST: readonly string[] = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
] as const;

export interface UtmAttribution {
  [key: string]: string;
}

/**
 * Safely resolves window.sessionStorage inside a guarded try/catch block.
 * Protects against environments where merely evaluating `window.sessionStorage`
 * throws SecurityError or DOMException (e.g. restrictive sandboxes, blocked storage).
 */
export function getSafeSessionStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.sessionStorage ?? null;
  } catch {
    return null;
  }
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
 * Strictly filters against the allowlist: unknown stored keys must NEVER reach attribution.
 * If data is corrupted, clears it and returns null without throwing.
 */
export function getStoredAttribution(
  allowlist: readonly string[] = APPROVED_UTM_ALLOWLIST,
  storageOverride?: Storage | null
): UtmAttribution | null {
  const storage =
    storageOverride !== undefined ? storageOverride : getSafeSessionStorage();
  if (!storage || allowlist.length === 0) return null;

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      try {
        storage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore safe clear failure
      }
      return null;
    }

    // Filter strictly against the approved allowlist and sanitize each value
    const sanitized: UtmAttribution = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (allowlist.includes(k) && typeof v === "string") {
        const cleanVal = sanitizeValue(v);
        if (cleanVal) {
          sanitized[k] = cleanVal;
        }
      }
    }
    return Object.keys(sanitized).length > 0 ? sanitized : null;
  } catch {
    try {
      storage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore sessionStorage access errors
    }
    return null;
  }
}

/**
 * Safely stores attribution in sessionStorage, enforcing allowlist filtering and sanitization.
 */
export function setStoredAttribution(
  attribution: UtmAttribution,
  allowlist: readonly string[] = APPROVED_UTM_ALLOWLIST,
  storageOverride?: Storage | null
): boolean {
  const storage =
    storageOverride !== undefined ? storageOverride : getSafeSessionStorage();
  if (!storage || !attribution || allowlist.length === 0) return false;

  try {
    const sanitized: UtmAttribution = {};
    for (const [k, v] of Object.entries(attribution)) {
      if (allowlist.includes(k) && typeof v === "string") {
        const cleanVal = sanitizeValue(v);
        if (cleanVal) {
          sanitized[k] = cleanVal;
        }
      }
    }
    if (Object.keys(sanitized).length === 0) return false;

    storage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    return true;
  } catch {
    return false;
  }
}

/**
 * Clears stored attribution after verified real API success.
 * If a consumed attribution snapshot is provided, only clears storage if
 * stored content matches that snapshot, protecting any newer campaign captured
 * while the request was in flight.
 */
export function clearStoredAttribution(
  consumedSnapshot?: UtmAttribution | null,
  storageOverride?: Storage | null
): void {
  const storage =
    storageOverride !== undefined ? storageOverride : getSafeSessionStorage();
  if (!storage) return;

  try {
    if (consumedSnapshot && Object.keys(consumedSnapshot).length > 0) {
      const currentRaw = storage.getItem(STORAGE_KEY);
      if (currentRaw) {
        try {
          const currentParsed = JSON.parse(currentRaw);
          // If current storage differs from what was sent, do not erase newer campaign
          const isIdentical =
            Object.keys(currentParsed).length === Object.keys(consumedSnapshot).length &&
            Object.keys(consumedSnapshot).every(
              (k) => currentParsed[k] === consumedSnapshot[k]
            );
          if (!isIdentical) {
            return;
          }
        } catch {
          // If current is corrupted, clear safely below
        }
      }
    }

    storage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failure
  }
}

/**
 * Captures landing attribution on page mount.
 * When storage fails or is blocked, valid live URL parameters remain usable.
 */
export function captureLandingAttribution(
  allowlist: readonly string[] = APPROVED_UTM_ALLOWLIST,
  searchStringOverride?: string,
  storageOverride?: Storage | null
): UtmAttribution | null {
  if (!UTM_COLLECTION_ENABLED) {
    return null;
  }
  if (typeof window === "undefined") {
    return null;
  }

  const searchString =
    searchStringOverride !== undefined ? searchStringOverride : window.location.search;

  const liveParams = extractAllowlistedParams(searchString, allowlist);

  const storage =
    storageOverride !== undefined ? storageOverride : getSafeSessionStorage();

  if (Object.keys(liveParams).length > 0) {
    if (storage) {
      setStoredAttribution(liveParams, allowlist, storage);
    }
    return liveParams;
  }

  if (storage) {
    return getStoredAttribution(allowlist, storage);
  }

  return null;
}

/**
 * Retrieves attribution for form submission:
 * Live URL values take priority; stored session attribution is used as fallback.
 * If storage is blocked, live URL params are still extracted safely.
 */
export function getAttributionForSubmission(
  allowlist: readonly string[] = APPROVED_UTM_ALLOWLIST,
  searchStringOverride?: string,
  storageOverride?: Storage | null
): UtmAttribution | null {
  if (!UTM_COLLECTION_ENABLED) {
    return null;
  }
  if (typeof window === "undefined") {
    return null;
  }

  const searchString =
    searchStringOverride !== undefined ? searchStringOverride : window.location.search;

  const liveParams = extractAllowlistedParams(searchString, allowlist);
  if (Object.keys(liveParams).length > 0) {
    return liveParams;
  }

  const storage =
    storageOverride !== undefined ? storageOverride : getSafeSessionStorage();

  if (storage) {
    return getStoredAttribution(allowlist, storage);
  }

  return null;
}
