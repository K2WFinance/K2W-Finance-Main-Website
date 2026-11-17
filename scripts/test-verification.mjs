import assert from "node:assert/strict";

// 1. Calculator math verification
function calculateLumpSum(amount, ratePercent, years) {
  const r = ratePercent / 100;
  return amount * Math.pow(1 + r, years);
}

function calculateMonthly(amount, ratePercent, years) {
  const r = ratePercent / 100;
  const monthlyRate = r / 12;
  const n = years * 12;
  return monthlyRate ? amount * (Math.pow(1 + monthlyRate, n) - 1) / monthlyRate : amount * n;
}

function calculateIncome(amount, ratePercent) {
  const r = ratePercent / 100;
  return (amount * r) / 12;
}

console.log("Verifying Calculator Formulas against Prototype...");
// Prototype defaults:
// Lump sum: 10,00,000 at 8% for 5 years
const lumpDefault = calculateLumpSum(1000000, 8, 5);
assert.equal(Math.round(lumpDefault), 1469328, "Lump sum default must equal 14,69,328");
console.log("✓ Lump sum default (₹10L, 8%, 5y): ₹" + Math.round(lumpDefault).toLocaleString("en-IN"));

// Monthly savings: 10,000 at 8% for 5 years
const monthlyDefault = calculateMonthly(10000, 8, 5);
assert.equal(Math.round(monthlyDefault), 734769, "Monthly savings default must equal 7,34,769");
console.log("✓ Monthly savings default (₹10k/mo, 8%, 5y): ₹" + Math.round(monthlyDefault).toLocaleString("en-IN"));

// Monthly income: 10,00,000 at 8%
const incomeDefault = calculateIncome(1000000, 8);
assert.equal(Math.round(incomeDefault), 6667, "Monthly income default must equal 6,667");
console.log("✓ Monthly income default (₹10L, 8%): ₹" + Math.round(incomeDefault).toLocaleString("en-IN"));

// Zero-rate test
assert.equal(calculateLumpSum(100000, 0, 5), 100000);
assert.equal(calculateMonthly(1000, 0, 5), 60000);
assert.equal(calculateIncome(100000, 0), 0);
console.log("✓ Zero-rate edge cases pass cleanly");

// 2. UTM sanitization test
import { sanitizeValue, extractAllowlistedParams, MAX_PARAM_LENGTH } from "../src/lib/utm.ts";

assert.equal(sanitizeValue("  test  "), "test");
assert.equal(sanitizeValue("   "), null);
assert.equal(sanitizeValue(""), null);
assert.equal(sanitizeValue(null), null);
assert.equal(sanitizeValue("a".repeat(300)).length, MAX_PARAM_LENGTH);

// When allowlist is empty (current state), no params extracted
const extracted = extractAllowlistedParams("?utm_source=google&utm_medium=cpc");
assert.deepEqual(extracted, {}, "Must extract nothing when allowlist is empty");

// When allowlist is provided (simulation of future approved list)
const testAllowlist = ["utm_source", "utm_campaign"];
const simulated = extractAllowlistedParams("?utm_source=google&unknown=hack&utm_campaign=winter", testAllowlist);
assert.deepEqual(simulated, { utm_source: "google", utm_campaign: "winter" });
assert.equal(simulated.unknown, undefined, "Must ignore unknown query parameters");

console.log("✓ UTM sanitization and allowlist filtering verified");
console.log("All calculation and attribution tests passed!");
