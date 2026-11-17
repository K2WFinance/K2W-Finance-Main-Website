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
 * Clears stored attribution after verified real API success only.
 * Demo form validation must NEVER invoke this.
 */
export function clearStoredAttribution(
  storageOverride?: Storage | null
): void {
  const storage =
    storageOverride !== undefined ? storageOverride : getSafeSessionStorage();
  if (!storage) return;

  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failure
  }
}

/**
 * Captures landing attribution on page mount.
 * Returns null immediately if collection is disabled, before accessing storage.
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

  const storage =
    storageOverride !== undefined ? storageOverride : getSafeSessionStorage();
  if (!storage || allowlist.length === 0) {
    return null;
  }

  const searchString =
    searchStringOverride !== undefined ? searchStringOverride : window.location.search;

  const liveParams = extractAllowlistedParams(searchString, allowlist);
  if (Object.keys(liveParams).length > 0) {
    setStoredAttribution(liveParams, allowlist, storage);
    return liveParams;
  }

  return getStoredAttribution(allowlist, storage);
}

/**
 * Retrieves attribution for form submission:
 * Live URL values take priority; stored session attribution is used as fallback.
 * Returns null immediately if collection is disabled, before accessing storage.
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

  const storage =
    storageOverride !== undefined ? storageOverride : getSafeSessionStorage();
  if (!storage || allowlist.length === 0) {
    return null;
  }

  const searchString =
    searchStringOverride !== undefined ? searchStringOverride : window.location.search;

  const liveParams = extractAllowlistedParams(searchString, allowlist);
  if (Object.keys(liveParams).length > 0) {
    return liveParams;
  }

  return getStoredAttribution(allowlist, storage);
}
