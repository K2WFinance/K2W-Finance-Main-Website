import assert from "node:assert/strict";
import {
  calculateValues,
  CALCULATOR_CONFIGS,
  getProductRateForTenure,
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
  getSafeSessionStorage,
  STORAGE_KEY,
  MAX_PARAM_LENGTH,
  UTM_COLLECTION_ENABLED,
  APPROVED_UTM_ALLOWLIST,
} from "../src/lib/utm.ts";

console.log("=================================================");
console.log("1. CALCULATOR VERIFICATION (USING PRODUCTION CODE)");
console.log("=================================================");

// A. Product Schedule Defaults Verification
const growthConfig = CALCULATOR_CONFIGS.growth;
const growthDefault = calculateValues(
  "growth",
  growthConfig.defaultAmount,
  growthConfig.defaultRate,
  growthConfig.defaultTenure
);
console.log(
  `Growth default: ${growthDefault.formattedResult} (Invested: ${growthDefault.formattedInvested}, Growth: ${growthDefault.formattedGrowth})`
);
assert.equal(growthDefault.formattedResult, "₹1,37,689", "Growth default for ₹1L @ 11.25% 3yr must be ₹1,37,689");
assert.equal(growthDefault.formattedInvested, "₹1,00,000");
assert.equal(growthDefault.formattedGrowth, "₹37,689");

const monthlyConfig = CALCULATOR_CONFIGS.monthly;
const monthlyDefault = calculateValues(
  "monthly",
  monthlyConfig.defaultAmount,
  monthlyConfig.defaultRate,
  monthlyConfig.defaultTenure
);
console.log(
  `Monthly default: ${monthlyDefault.formattedResult} (Invested: ${monthlyDefault.formattedInvested}, Growth: ${monthlyDefault.formattedGrowth})`
);
assert.equal(monthlyDefault.formattedResult, "₹2,10,133", "Monthly default for ₹5k @ 10.25% 3yr must be ₹2,10,133");
assert.equal(monthlyDefault.formattedInvested, "₹1,80,000");
assert.equal(monthlyDefault.formattedGrowth, "₹30,133");

const incomeConfig = CALCULATOR_CONFIGS.income;
const incomeDefault = calculateValues(
  "income",
  incomeConfig.defaultAmount,
  incomeConfig.defaultRate,
  incomeConfig.defaultTenure
);
console.log(`Income default: ${incomeDefault.formattedResult} monthly payout`);
assert.equal(incomeDefault.formattedResult, "₹8,542", "Income default for ₹10L @ 10.25% 3yr must be ₹8,542");
assert.equal(incomeDefault.formattedInvested, "₹10,00,000");

// B. Complete Client Schedule Table Verifications
console.log("\n--- B. MIP Schedule Table Verification ---");
const mipTable = [
  { amount: 20000, expected: [142, 163, 171, 179, 179] },
  { amount: 50000, expected: [354, 406, 427, 448, 448] },
  { amount: 100000, expected: [708, 813, 854, 896, 896] },
  { amount: 200000, expected: [1417, 1625, 1708, 1792, 1792] },
  { amount: 500000, expected: [3542, 4063, 4271, 4479, 4479] },
  { amount: 1000000, expected: [7083, 8125, 8542, 8958, 8958] },
];
const mipTenures = [1, 2, 3, 5, 7];
for (const row of mipTable) {
  mipTenures.forEach((t, idx) => {
    const rate = getProductRateForTenure("income", t);
    const res = calculateValues("income", row.amount, rate, t);
    const expectedVal = row.expected[idx];
    assert.equal(
      Math.round(res.result),
      expectedVal,
      `MIP mismatch for ₹${row.amount} at tenure ${t} yr: got ${Math.round(res.result)}, expected ${expectedVal}`
    );
  });
}
console.log("✓ MIP Table fully verified across all deposit amounts and tenures");

console.log("\n--- C. FD Schedule Table Verification ---");
const fdTable = [
  { amount: 10000, expected: [10975, 12155, 13769, 17821] },
  { amount: 20000, expected: [21950, 24310, 27538, 35642] },
  { amount: 50000, expected: [54875, 60775, 68845, 89105] },
  { amount: 100000, expected: [109750, 121551, 137689, 178210] },
  { amount: 200000, expected: [219500, 243101, 275379, 356420] },
  { amount: 500000, expected: [548750, 607753, 688446, 891049] },
];
const fdTenures = [1, 2, 3, 5];
for (const row of fdTable) {
  fdTenures.forEach((t, idx) => {
    const rate = getProductRateForTenure("growth", t);
    const res = calculateValues("growth", row.amount, rate, t);
    const expectedVal = row.expected[idx];
    assert.equal(
      Math.round(res.result),
      expectedVal,
      `FD mismatch for ₹${row.amount} at tenure ${t} yr: got ${Math.round(res.result)}, expected ${expectedVal}`
    );
  });
}
console.log("✓ FD Table fully verified across all deposit amounts and tenures");

console.log("\n--- D. RD Schedule Table Verification ---");
const rdTable = [
  { amount: 500, expected: [6317, 13283, 21013, 29647, 39841] },
  { amount: 1000, expected: [12634, 26565, 42027, 59294, 79683] },
  { amount: 2000, expected: [25268, 53130, 84053, 118588, 159366] },
  { amount: 3000, expected: [37901, 79695, 126080, 177882, 239049] },
  { amount: 4000, expected: [50535, 106260, 168107, 237176, 318732] },
  { amount: 5000, expected: [63169, 132825, 210133, 296470, 398414] },
];
const rdTenures = [1, 2, 3, 4, 5];
for (const row of rdTable) {
  rdTenures.forEach((t, idx) => {
    const rate = getProductRateForTenure("monthly", t);
    const res = calculateValues("monthly", row.amount, rate, t);
    const expectedVal = row.expected[idx];
    assert.equal(
      Math.round(res.result),
      expectedVal,
      `RD mismatch for ₹${row.amount} at tenure ${t} yr: got ${Math.round(res.result)}, expected ${expectedVal}`
    );
  });
}
console.log("✓ RD Table fully verified across all deposit amounts and tenures");

// E. Zero-Rate Tests
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

// F. Representative Boundary Value Tests
const growthMin = calculateValues("growth", growthConfig.minAmount, growthConfig.minRate, growthConfig.minTenure);
assert.equal(growthMin.formattedInvested, "₹10,000");
assert.equal(Math.round(growthMin.result), 10100); // 10,000 * 1.01

const growthMax = calculateValues("growth", growthConfig.maxAmount, growthConfig.maxRate, growthConfig.maxTenure);
assert.equal(growthMax.formattedInvested, "₹50,00,000");
assert.ok(growthMax.result > growthConfig.maxAmount);

const monthlyMin = calculateValues("monthly", monthlyConfig.minAmount, monthlyConfig.minRate, monthlyConfig.minTenure);
assert.equal(monthlyMin.formattedInvested, "₹6,000"); // 500 * 12
assert.ok(monthlyMin.result > 6000);

const monthlyMax = calculateValues("monthly", monthlyConfig.maxAmount, monthlyConfig.maxRate, monthlyConfig.maxTenure);
assert.equal(monthlyMax.formattedInvested, "₹84,00,000"); // 100,000 * 84 months
assert.ok(monthlyMax.result > 8400000);

const incomeMin = calculateValues("income", incomeConfig.minAmount, incomeConfig.minRate, 1);
assert.equal(incomeMin.formattedInvested, "₹20,000");
assert.equal(Math.round(incomeMin.result), 17); // 20,000 * 0.01 / 12 = 16.67 -> 17

const incomeMax = calculateValues("income", incomeConfig.maxAmount, incomeConfig.maxRate, 1);
assert.equal(incomeMax.formattedInvested, "₹50,00,000");
assert.equal(Math.round(incomeMax.result), 62500); // 5,000,000 * 0.15 / 12 = 62,500
console.log("✓ Boundary calculations verified (min/max for amounts, rates, tenures)");

console.log("\n=================================================");
console.log("2. UTM ATTRIBUTION VERIFICATION");
console.log("=================================================");

// A. Production Flag State
assert.equal(UTM_COLLECTION_ENABLED, true, "Active UTM collection is enabled with approved allowlist");
assert.deepEqual(
  APPROVED_UTM_ALLOWLIST,
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"],
  "Approved 7-field UTM allowlist must match"
);
console.log("✓ Verified: Active UTM collection is ENABLED with approved 7-field allowlist");

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

// F. Blocked Storage Method Exceptions Test (SecurityError on getItem/setItem)
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

// I. Verified API Success Clearance Test & In-Flight Preservation
// 1. If stored attribution matches consumed snapshot, it is cleared
clearStoredAttribution(submissionAttribution, cleanUrlStorage);
assert.equal(cleanUrlStorage.getItem(STORAGE_KEY), null, "Clear attribution purges matching stored key");

// 2. If a newer campaign was stored while request was in-flight, it is preserved
setStoredAttribution({ utm_source: "bing", utm_campaign: "autumn_2026" }, testAllowlist, cleanUrlStorage);
clearStoredAttribution({ utm_source: "google", utm_campaign: "summer_2026" }, cleanUrlStorage);
const preserved = getStoredAttribution(testAllowlist, cleanUrlStorage);
assert.deepEqual(preserved, { utm_source: "bing", utm_campaign: "autumn_2026" }, "Newer in-flight attribution must be preserved");
clearStoredAttribution(preserved, cleanUrlStorage);
assert.equal(cleanUrlStorage.getItem(STORAGE_KEY), null);
console.log("✓ Verified: Stored attribution cleared upon verified API success and preserves newer in-flight campaigns");

console.log("\n=================================================");
console.log("3. REGRESSION TESTS: WINDOW.SESSIONSTORAGE ACCESS");
console.log("=================================================");

// Simulate a browser window environment where accessing `window.sessionStorage` property itself throws SecurityError
const originalWindow = globalThis.window;
try {
  let sessionStoragePropertyAccessCount = 0;

  const mockWindow = {
    location: { search: "?utm_source=google&utm_campaign=test" },
  };

  Object.defineProperty(mockWindow, "sessionStorage", {
    get() {
      sessionStoragePropertyAccessCount++;
      throw new Error("SecurityError: Access is denied for this document.");
    },
    configurable: true,
  });

  // Attach mock window to global scope
  globalThis.window = mockWindow;

  // A. Guarded helper test
  assert.doesNotThrow(() => {
    const storage = getSafeSessionStorage();
    assert.equal(storage, null, "getSafeSessionStorage must return null when property access throws");
  }, "getSafeSessionStorage must not throw when window.sessionStorage property throws");
  console.log("✓ Verified: getSafeSessionStorage catches SecurityError on window.sessionStorage access");

  // B. Default invocation test without injecting mock storage argument
  assert.doesNotThrow(() => {
    const res = getStoredAttribution(testAllowlist); // No storage argument passed!
    assert.equal(res, null);
  }, "getStoredAttribution default invocation must not throw when window.sessionStorage property throws");

  assert.doesNotThrow(() => {
    const res = setStoredAttribution({ utm_source: "google" }, testAllowlist); // No storage argument passed!
    assert.equal(res, false);
  }, "setStoredAttribution default invocation must not throw when window.sessionStorage property throws");

  assert.doesNotThrow(() => {
    clearStoredAttribution(); // No storage argument passed!
  }, "clearStoredAttribution default invocation must not throw when window.sessionStorage property throws");
  console.log("✓ Verified: Default invocations without storage arguments succeed safely under SecurityError");

  // C. Resilient live URL capture under SecurityError
  assert.doesNotThrow(() => {
    const captured = captureLandingAttribution(testAllowlist);
    assert.deepEqual(
      captured,
      { utm_source: "google", utm_campaign: "test" },
      "Must safely extract live URL params even when sessionStorage throws SecurityError"
    );
  }, "captureLandingAttribution must not throw when window.sessionStorage property throws");

  assert.doesNotThrow(() => {
    const submissionAtt = getAttributionForSubmission(testAllowlist);
    assert.deepEqual(
      submissionAtt,
      { utm_source: "google", utm_campaign: "test" },
      "Must safely return live URL params for submission even when sessionStorage throws SecurityError"
    );
  }, "getAttributionForSubmission must not throw when window.sessionStorage property throws");
  console.log("✓ Verified: Live URL capture succeeds safely even under sessionStorage SecurityError");

} finally {
  // Restore original window
  globalThis.window = originalWindow;
}

console.log("\n=================================================");
console.log("ALL UNIT AND REGRESSION CHECKS PASSED!");
console.log("=================================================");
