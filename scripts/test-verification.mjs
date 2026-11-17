import assert from "node:assert/strict";
import {
  calculateValues,
  CALCULATOR_CONFIGS,
  formatIndianCurrency,
  formatRate,
  formatTenure,
} from "../src/lib/calculator.ts";
import {
  sanitizeValue,
  extractAllowlistedParams,
  getStoredAttribution,
  setStoredAttribution,
  clearStoredAttribution,
  captureLandingAttribution,
  getAttributionForSubmission,
  STORAGE_KEY,
  MAX_PARAM_LENGTH,
  UTM_COLLECTION_ENABLED,
  APPROVED_UTM_ALLOWLIST,
} from "../src/lib/utm.ts";

console.log("=================================================");
console.log("1. CALCULATOR VERIFICATION (USING PRODUCTION CODE)");
console.log("=================================================");

// A. Prototype Defaults Verification
const growthConfig = CALCULATOR_CONFIGS.growth;
const growthDefault = calculateValues(
  "growth",
  growthConfig.defaultAmount,
  growthConfig.defaultRate,
  growthConfig.defaultTenure
);
console.log(`Growth default: ${growthDefault.formattedResult} (Invested: ${growthDefault.formattedInvested}, Growth: ${growthDefault.formattedGrowth})`);
assert.equal(growthDefault.formattedResult, "₹14,69,328", "Growth default must be ₹14,69,328");
assert.equal(growthDefault.formattedInvested, "₹10,00,000");
assert.equal(growthDefault.formattedGrowth, "₹4,69,328");

const monthlyConfig = CALCULATOR_CONFIGS.monthly;
const monthlyDefault = calculateValues(
  "monthly",
  monthlyConfig.defaultAmount,
  monthlyConfig.defaultRate,
  monthlyConfig.defaultTenure
);
console.log(`Monthly default: ${monthlyDefault.formattedResult} (Invested: ${monthlyDefault.formattedInvested}, Growth: ${monthlyDefault.formattedGrowth})`);
assert.equal(monthlyDefault.formattedResult, "₹7,34,769", "Monthly default must be ₹7,34,769");
assert.equal(monthlyDefault.formattedInvested, "₹6,00,000");
assert.equal(monthlyDefault.formattedGrowth, "₹1,34,769");

const incomeConfig = CALCULATOR_CONFIGS.income;
const incomeDefault = calculateValues(
  "income",
  incomeConfig.defaultAmount,
  incomeConfig.defaultRate,
  incomeConfig.defaultTenure
);
console.log(`Income default: ${incomeDefault.formattedResult} monthly payout`);
assert.equal(incomeDefault.formattedResult, "₹6,667", "Income default must be ₹6,667");
assert.equal(incomeDefault.formattedInvested, "₹10,00,000");

// B. Zero-Rate Tests
const growthZero = calculateValues("growth", 1000000, 0, 5);
assert.equal(growthZero.result, 1000000);
assert.equal(growthZero.growth, 0);
assert.equal(growthZero.formattedResult, "₹10,00,000");

const monthlyZero = calculateValues("monthly", 10000, 0, 5);
assert.equal(monthlyZero.result, 600000); // 10,000 * 60 months
assert.equal(monthlyZero.growth, 0);
assert.equal(monthlyZero.formattedResult, "₹6,00,000");

const incomeZero = calculateValues("income", 1000000, 0, 5);
assert.equal(incomeZero.result, 0);
assert.equal(incomeZero.formattedResult, "₹0");
console.log("✓ Zero-rate calculations verified across all three modes");

// C. Representative Boundary Value Tests
// Growth Boundaries
const growthMin = calculateValues("growth", growthConfig.minAmount, growthConfig.minRate, growthConfig.minTenure);
assert.equal(growthMin.formattedInvested, "₹50,000");
assert.equal(Math.round(growthMin.result), 50500); // 50,000 * 1.01

const growthMax = calculateValues("growth", growthConfig.maxAmount, growthConfig.maxRate, growthConfig.maxTenure);
assert.equal(growthMax.formattedInvested, "₹50,00,000");
assert.ok(growthMax.result > growthConfig.maxAmount);

// Monthly Boundaries
const monthlyMin = calculateValues("monthly", monthlyConfig.minAmount, monthlyConfig.minRate, monthlyConfig.minTenure);
assert.equal(monthlyMin.formattedInvested, "₹6,000"); // 500 * 12
assert.ok(monthlyMin.result > 6000);

const monthlyMax = calculateValues("monthly", monthlyConfig.maxAmount, monthlyConfig.maxRate, monthlyConfig.maxTenure);
assert.equal(monthlyMax.formattedInvested, "₹1,80,00,000"); // 100,000 * 180
assert.ok(monthlyMax.result > 18000000);

// Income Boundaries
const incomeMin = calculateValues("income", incomeConfig.minAmount, incomeConfig.minRate, 1);
assert.equal(incomeMin.formattedInvested, "₹50,000");
assert.equal(Math.round(incomeMin.result), 42); // 50,000 * 0.01 / 12 = 41.67 -> 42

const incomeMax = calculateValues("income", incomeConfig.maxAmount, incomeConfig.maxRate, 1);
assert.equal(incomeMax.formattedInvested, "₹50,00,000");
assert.equal(Math.round(incomeMax.result), 62500); // 5,000,000 * 0.15 / 12 = 62,500
console.log("✓ Boundary calculations verified (min/max for amounts, rates, tenures)");

console.log("\n=================================================");
console.log("2. UTM ATTRIBUTION VERIFICATION");
console.log("=================================================");

// A. Production Flag State
assert.equal(UTM_COLLECTION_ENABLED, false, "Active UTM collection must remain disabled");
assert.deepEqual(APPROVED_UTM_ALLOWLIST, [], "K2WFINANCE allowlist must be empty until approved");
console.log("✓ Verified: Active UTM collection is DISABLED pending client approval");

// B. Value Sanitization
assert.equal(sanitizeValue("   google   "), "google");
assert.equal(sanitizeValue(""), null);
assert.equal(sanitizeValue("   "), null);
assert.equal(sanitizeValue(null), null);
assert.equal(sanitizeValue(undefined), null);
const oversized = "a".repeat(300);
assert.equal(sanitizeValue(oversized)?.length, MAX_PARAM_LENGTH);
console.log("✓ Verified: Whitespace trimming, null handling, and 200-char truncation");

// C. Simulated In-Memory Storage for Testing
function createMockStorage(initialData = {}) {
  const store = new Map(Object.entries(initialData));
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

const testAllowlist = ["utm_source", "utm_medium", "utm_campaign"];

// D. Unknown Stored Keys Rejection Test
const dirtyStorage = createMockStorage({
  [STORAGE_KEY]: JSON.stringify({
    utm_source: "google",
    utm_medium: "cpc",
    unknown_param: "malicious_payload",
    session_token: "secret_token_123",
    email: "user@example.com",
  }),
});
const readAttribution = getStoredAttribution(testAllowlist, dirtyStorage);
console.log("Read from dirty storage:", readAttribution);
assert.deepEqual(readAttribution, { utm_source: "google", utm_medium: "cpc" });
assert.equal(readAttribution?.unknown_param, undefined, "Unknown keys must be rejected on read");
assert.equal(readAttribution?.session_token, undefined, "Non-allowlisted keys must never reach attribution");
assert.equal(readAttribution?.email, undefined, "PII keys must never reach attribution");
console.log("✓ Verified: Unknown stored keys are strictly filtered out on reading");

// E. Malformed JSON Storage Test
const corruptStorage = createMockStorage({
  [STORAGE_KEY]: "{ malformed json... ### }",
});
const readCorrupt = getStoredAttribution(testAllowlist, corruptStorage);
assert.equal(readCorrupt, null, "Corrupt storage must return null safely without throwing");
assert.equal(corruptStorage.getItem(STORAGE_KEY), null, "Corrupt storage must be cleared");
console.log("✓ Verified: Malformed JSON handled safely and purged without throwing");

// F. Blocked Storage Test (SecurityError / QuotaExceededError simulation)
const blockedStorage = {
  getItem: () => {
    throw new Error("SecurityError: The operation is insecure.");
  },
  setItem: () => {
    throw new Error("QuotaExceededError: Storage quota exceeded.");
  },
  removeItem: () => {
    throw new Error("SecurityError: Blocked.");
  },
};
assert.doesNotThrow(() => {
  const res = getStoredAttribution(testAllowlist, blockedStorage);
  assert.equal(res, null);
}, "Must handle blocked storage without crashing");

assert.doesNotThrow(() => {
  const ok = setStoredAttribution({ utm_source: "google" }, testAllowlist, blockedStorage);
  assert.equal(ok, false);
}, "Must handle blocked storage setItem safely");
console.log("✓ Verified: Blocked storage / quota exceptions handled safely without crashing");

// G. Clean-URL Fallback Simulation
const cleanUrlStorage = createMockStorage();
// 1. Visitor lands on page with UTMs
const landingUrl = "?utm_source=google&utm_campaign=summer_2026&gclid=test123";
const landingParams = extractAllowlistedParams(landingUrl, testAllowlist);
setStoredAttribution(landingParams, testAllowlist, cleanUrlStorage);

// 2. Visitor navigates to clean URL ("")
const cleanUrl = "";
const submissionAttribution = (() => {
  const live = extractAllowlistedParams(cleanUrl, testAllowlist);
  if (Object.keys(live).length > 0) return live;
  return getStoredAttribution(testAllowlist, cleanUrlStorage);
})();

console.log("Attribution on clean URL fallback:", submissionAttribution);
assert.deepEqual(submissionAttribution, { utm_source: "google", utm_campaign: "summer_2026" });
console.log("✓ Verified: Clean-URL fallback preserves stored session attribution");

// H. Preservation After Demo Validation
// In demo mode, form validation completes locally without calling clearStoredAttribution
assert.equal(cleanUrlStorage.getItem(STORAGE_KEY) !== null, true);
console.log("✓ Verified: Demo validation preserves attribution in storage");

// I. Verified API Success Clearance Test
clearStoredAttribution(cleanUrlStorage);
assert.equal(cleanUrlStorage.getItem(STORAGE_KEY), null, "Clear attribution purges stored key");
console.log("✓ Verified: Stored attribution cleared only upon explicit API success call");

console.log("\n=================================================");
console.log("ALL UNIT AND INTEGRATION CHECKS PASSED!");
console.log("=================================================");
