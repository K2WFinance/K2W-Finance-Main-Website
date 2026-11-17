import { chromium } from "/Users/Ishant/Downloads/Dev-Clapingo/codeistaai-website/node_modules/playwright-core/index.mjs";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const SCREENSHOTS_DIR = path.resolve("./docs/screenshots");
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function runBrowserTests() {
  console.log("Launching Google Chrome via Playwright...");
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });

  const nextUrl = "http://localhost:3000";
  const protoUrl = "http://localhost:3001/index.html";

  const viewports = [
    { name: "mobile-375", width: 375, height: 812 },
    { name: "mobile-390", width: 390, height: 844 },
    { name: "mobile-414", width: 414, height: 896 },
    { name: "tablet-768", width: 768, height: 1024 },
    { name: "desktop-1440", width: 1440, height: 900 },
  ];

  const consoleErrors = [];

  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });
  page.on("pageerror", (err) => {
    consoleErrors.push(err.message);
  });

  console.log("\n--- VIEWPORT & OVERFLOW CHECKS ---");
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(nextUrl, { waitUntil: "networkidle" });

    // Check overflow
    const overflowResult = await page.evaluate(() => {
      const scrollW = document.documentElement.scrollWidth;
      const clientW = document.documentElement.clientWidth;
      return {
        scrollWidth: scrollW,
        clientWidth: clientW,
        hasOverflow: scrollW > clientW,
      };
    });

    console.log(
      `Viewport ${vp.name} (${vp.width}px): scrollWidth=${overflowResult.scrollWidth}, clientWidth=${overflowResult.clientWidth}, overflow=${overflowResult.hasOverflow}`
    );
    assert.equal(
      overflowResult.hasOverflow,
      false,
      `Horizontal overflow detected at ${vp.width}px!`
    );

    // Save screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `nextjs-${vp.name}.png`),
      fullPage: false,
    });

    // Also screenshot prototype for comparison
    const protoPage = await context.newPage();
    await protoPage.setViewportSize({ width: vp.width, height: vp.height });
    await protoPage.goto(protoUrl, { waitUntil: "networkidle" });
    await protoPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, `prototype-${vp.name}.png`),
      fullPage: false,
    });
    await protoPage.close();
  }

  console.log("\n--- CALCULATOR FUNCTIONALITY TESTS ---");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(nextUrl, { waitUntil: "networkidle" });

  // 1. One-time savings default
  const lumpResult = await page.$eval("#result", (el) => el.textContent.trim());
  const lumpAmount = await page.$eval("#amount-value", (el) => el.textContent.trim());
  const lumpRate = await page.$eval("#rate-value", (el) => el.textContent.trim());
  const lumpTenure = await page.$eval("#tenure-value", (el) => el.textContent.trim());
  console.log(`Lump sum defaults: amount=${lumpAmount}, rate=${lumpRate}, tenure=${lumpTenure}, result=${lumpResult}`);
  assert.equal(lumpResult, "₹14,69,328");
  assert.equal(lumpAmount, "₹10,00,000");

  // Verify bold styling on financial numbers
  const isLumpBold = await page.$eval("#result", (el) => window.getComputedStyle(el).fontWeight);
  console.log(`Result font-weight: ${isLumpBold}`);
  assert.ok(parseInt(isLumpBold) >= 600, "Financial results must be bold");

  // 2. Switch to monthly savings
  await page.click('button[data-mode="monthly"]');
  const monthlyResult = await page.$eval("#result", (el) => el.textContent.trim());
  const monthlyAmount = await page.$eval("#amount-value", (el) => el.textContent.trim());
  console.log(`Monthly defaults: amount=${monthlyAmount}, result=${monthlyResult}`);
  assert.equal(monthlyResult, "₹7,34,769");
  assert.equal(monthlyAmount, "₹10,000");

  // 3. Switch to monthly income
  await page.click('button[data-mode="income"]');
  const incomeResult = await page.$eval("#result", (el) => el.textContent.trim());
  const tenureHidden = await page.$eval("#tenure-control", (el) => el === null || el.offsetParent === null);
  console.log(`Income defaults: result=${incomeResult}, tenureControlHidden=${tenureHidden}`);
  assert.equal(incomeResult, "₹6,667");
  assert.equal(tenureHidden, true, "Tenure control must be hidden in income mode");

  console.log("\n--- GOALS & PRESELECTION TESTS ---");
  // Test Goal selection
  await page.click('button[data-goal="vehicle"]');
  const vehicleTitle = await page.$eval("#goal-title", (el) => el.textContent.trim());
  const vehicleNumber = await page.$eval("#goal-number", (el) => el.textContent.trim());
  console.log(`Vehicle goal: title="${vehicleTitle}", number="${vehicleNumber}"`);
  assert.equal(vehicleNumber, "₹3 lakh");

  // Click CTA to preselect vehicle goal in form
  await page.click("#goal-cta");
  const selectedInterestAfterGoal = await page.$eval("#interest", (el) => el.value);
  console.log(`Form interest preselected from Goal: "${selectedInterestAfterGoal}"`);
  assert.equal(selectedInterestAfterGoal, "A new vehicle");

  // Test Savings Option preselection
  await page.click('a[data-interest="Fixed deposits"]');
  const selectedInterestAfterSavings = await page.$eval("#interest", (el) => el.value);
  console.log(`Form interest preselected from Savings Option: "${selectedInterestAfterSavings}"`);
  assert.equal(selectedInterestAfterSavings, "Fixed deposits");

  console.log("\n--- MOBILE NAVIGATION TESTS ---");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.click(".menu");
  const isDrawerOpen = await page.$eval("#mobile-nav", (el) => el.classList.contains("open") && !el.hidden);
  const isBodyLocked = await page.evaluate(() => document.body.style.overflow === "hidden");
  console.log(`Mobile nav open: ${isDrawerOpen}, body scroll locked: ${isBodyLocked}`);
  assert.equal(isDrawerOpen, true);
  assert.equal(isBodyLocked, true);

  // Close via Escape
  await page.keyboard.press("Escape");
  const isDrawerClosed = await page.$eval("#mobile-nav", (el) => !el.classList.contains("open") && el.hidden);
  const isBodyUnlocked = await page.evaluate(() => document.body.style.overflow === "");
  console.log(`Mobile nav closed via Escape: ${isDrawerClosed}, body scroll unlocked: ${isBodyUnlocked}`);
  assert.equal(isDrawerClosed, true);
  assert.equal(isBodyUnlocked, true);

  console.log("\n--- FORM VALIDATION TESTS ---");
  await page.setViewportSize({ width: 1440, height: 900 });

  // 1. Submit empty form
  await page.click('button[type="submit"]');
  const nameError = await page.$eval("#name-error", (el) => el.textContent.trim());
  const activeElementId = await page.evaluate(() => document.activeElement.id);
  console.log(`Empty submit validation: nameError="${nameError}", focusedElementId="${activeElementId}"`);
  assert.equal(nameError, "Enter a name with 2–80 characters.");
  assert.equal(activeElementId, "name", "First invalid field must receive focus");

  // 2. Fill invalid phone
  await page.fill("#name", "Ishant Sharma");
  await page.fill("#phone", "12345");
  await page.click('button[type="submit"]');
  const phoneError = await page.$eval("#phone-error", (el) => el.textContent.trim());
  console.log(`Invalid phone error: "${phoneError}"`);
  assert.equal(phoneError, "Enter a valid 10-digit Indian mobile number.");

  // 3. Fill valid details and submit demo
  await page.fill("#phone", "+91 98765 43210");
  await page.fill("#email", "ishant@example.com");
  await page.selectOption("#interest", "Retirement");
  await page.check("#consent");
  await page.click('button[type="submit"]');

  const statusText = await page.$eval("#form-status", (el) => el.textContent.trim());
  console.log(`Demo submit status message: "${statusText}"`);
  assert.equal(
    statusText,
    "Demo validation complete. No information was sent or saved. Your consultation has not been booked."
  );

  console.log("\n--- LOGO INTEGRITY & DIMENSIONS CHECK ---");
  const logoBox = await page.$eval(".logo-art > img", (el) => {
    const rect = el.getBoundingClientRect();
    return { width: rect.width, height: rect.height, naturalWidth: el.naturalWidth, naturalHeight: el.naturalHeight };
  });
  console.log("Logo dimensions:", logoBox);
  assert.ok(logoBox.width > 0 && logoBox.height > 0);
  assert.equal(logoBox.naturalWidth, 1600);
  assert.equal(logoBox.naturalHeight, 533);

  console.log("\n--- CONSOLE ERRORS REPORT ---");
  console.log(`Console error count: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.error("Errors found:", consoleErrors);
  }
  assert.equal(consoleErrors.length, 0, "No browser console or hydration errors allowed");

  await browser.close();
  console.log("\nAll browser verification checks passed successfully!");
}

runBrowserTests().catch((err) => {
  console.error("Browser test failed:", err);
  process.exit(1);
});
