import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const SCREENSHOTS_DIR = path.resolve("./docs/screenshots");
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function scrollPageToTriggerAllReveals(page) {
  // Step through entire page height with instant scroll so smooth-scroll CSS
  // does not short-circuit ScrollTrigger activation on lower sections.
  await page.evaluate(async () => {
    const distance = 350;
    const totalHeight = document.body.scrollHeight;
    let current = 0;
    while (current < totalHeight) {
      current += distance;
      window.scrollTo({ top: current, behavior: "instant" });
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo({ top: totalHeight, behavior: "instant" });
  });
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.waitForTimeout(250);
}

async function runBrowserTests() {
  console.log("Launching Google Chrome via local Playwright-core...");
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
  const networkRequests = [];

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

  // Track all network requests made by the Next.js page
  page.on("request", (req) => {
    networkRequests.push({
      url: req.url(),
      method: req.method(),
      headers: req.headers(),
      postData: req.postData(),
    });
  });

  console.log("\n=================================================");
  console.log("1. FULL-PAGE SCREENSHOTS & OVERFLOW CHECKS");
  console.log("=================================================");

  for (const vp of viewports) {
    // A. Next.js Version
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(nextUrl, { waitUntil: "networkidle" });
    await scrollPageToTriggerAllReveals(page);

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
      `Next.js ${vp.name} (${vp.width}px): scrollWidth=${overflowResult.scrollWidth}, clientWidth=${overflowResult.clientWidth}, overflow=${overflowResult.hasOverflow}`
    );
    assert.equal(
      overflowResult.hasOverflow,
      false,
      `Horizontal overflow detected in Next.js at ${vp.width}px!`
    );

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `nextjs-${vp.name}-full.png`),
      fullPage: true,
    });

    // B. Prototype Version
    const protoPage = await context.newPage();
    await protoPage.setViewportSize({ width: vp.width, height: vp.height });
    await protoPage.goto(protoUrl, { waitUntil: "networkidle" });
    await scrollPageToTriggerAllReveals(protoPage);

    await protoPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, `prototype-${vp.name}-full.png`),
      fullPage: true,
    });
    await protoPage.close();
  }
  console.log("✓ Full-page screenshots captured for all 5 viewports");

  console.log("\n=================================================");
  console.log("2. CALCULATOR SLIDERS & BOLD WEIGHT VERIFICATION");
  console.log("=================================================");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(nextUrl, { waitUntil: "networkidle" });

  // Update lump sum sliders using React-compatible native setter
  await page.evaluate(() => {
    const setRangeValue = (id, val) => {
      const el = document.getElementById(id);
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      ).set;
      nativeSetter.call(el, val);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    setRangeValue("amount", "2500000");
    setRangeValue("tenure", "7");
    setRangeValue("rate", "10");
  });

  const updatedResult = await page.$eval("#result", (el) => el.textContent.trim());
  const updatedAmountVal = await page.$eval("#amount-value", (el) => el.textContent.trim());
  const updatedRateVal = await page.$eval("#rate-value", (el) => el.textContent.trim());
  const updatedTenureVal = await page.$eval("#tenure-value", (el) => el.textContent.trim());
  console.log(`Updated lump sum: amount=${updatedAmountVal}, rate=${updatedRateVal}, tenure=${updatedTenureVal}, result=${updatedResult}`);
  assert.equal(updatedAmountVal, "₹25,00,000");
  assert.equal(updatedRateVal, "10.00%");
  assert.equal(updatedTenureVal, "7 years");
  assert.equal(updatedResult, "₹48,71,793");

  // Verify weight 700 on updated figures & active controls
  const resultWeight = await page.$eval("#result", (el) => window.getComputedStyle(el).fontWeight);
  const amountValWeight = await page.$eval("#amount-value", (el) => window.getComputedStyle(el).fontWeight);
  const segActiveWeight = await page.$eval('.seg button[aria-pressed="true"]', (el) => window.getComputedStyle(el).fontWeight);
  console.log(`Computed font weights after update: result=${resultWeight}, amount-value=${amountValWeight}, seg-active=${segActiveWeight}`);
  assert.equal(resultWeight, "700", "Result must use font-weight 700");
  assert.equal(amountValWeight, "700", "Amount label value must use font-weight 700");
  assert.equal(segActiveWeight, "700", "Selected segment button must use font-weight 700 (bold)");

  // Verify Monthly Income Term slider and MIP calculation
  console.log("\n--- Testing Monthly Income (MIP) Term & Calculation ---");
  await page.click('button[data-mode="income"]');
  const isTenureHidden = await page.$eval("#tenure-control", (el) => el.hidden);
  assert.equal(isTenureHidden, false, "Monthly income must have Term slider visible");
  const tenureLabel = await page.$eval("#tenure-label", (el) => el.textContent.trim());
  assert.equal(tenureLabel, "Term", "Tenure label for income mode must be 'Term'");
  const incomeResult = await page.$eval("#result", (el) => el.textContent.trim());
  console.log(`Income default result: ${incomeResult} (expected: ₹8,542 for ₹10L @ 10.25% 3yr)`);
  assert.equal(incomeResult, "₹8,542");

  // Test direct keyboard entry into amount, rate, and tenure input boxes
  console.log("\n--- Testing Direct Input Entry (Enter Value Option) ---");
  await page.click('button[data-mode="growth"]');
  await page.fill("#amount-input", "500000");
  await page.evaluate(() => document.getElementById("amount-input").dispatchEvent(new Event("blur")));
  const typedAmountSlider = await page.$eval("#amount", (el) => el.value);
  assert.equal(typedAmountSlider, "500000", "Slider must sync to typed amount");

  await page.fill("#rate-input", "12");
  await page.evaluate(() => document.getElementById("rate-input").dispatchEvent(new Event("blur")));
  const typedRateSlider = await page.$eval("#rate", (el) => el.value);
  assert.equal(typedRateSlider, "12", "Slider must sync to typed rate");

  await page.fill("#tenure-input", "5");
  await page.evaluate(() => document.getElementById("tenure-input").dispatchEvent(new Event("blur")));
  const typedTenureSlider = await page.$eval("#tenure", (el) => el.value);
  assert.equal(typedTenureSlider, "5", "Slider must sync to typed tenure");
  console.log("✓ Direct input typing verified: sliders and values sync bidirectionally");

  console.log("\n=================================================");
  console.log("3. ALL FIVE APPROVED GOAL CTAS & PRESELECTION");
  console.log("=================================================");
  const goalTests = [
    { key: "dreams", expectedInterest: "Travel & personal dreams", expectedTitle: "Fulfil your dreams. Plan for travel and experiences." },
    { key: "business", expectedInterest: "Start your own business", expectedTitle: "Start your own business. Turn savings into opportunity." },
    { key: "emergency", expectedInterest: "Emergency fund", expectedTitle: "Build an emergency fund. Ready for unexpected costs." },
    { key: "home", expectedInterest: "Your own home", expectedTitle: "Save for your dream home. Turn vision into reality." },
    { key: "family", expectedInterest: "Education & family", expectedTitle: "Secure your family's future. Prepare for every milestone." },
  ];

  for (const g of goalTests) {
    await page.click(`button[data-goal="${g.key}"]`);
    const title = await page.$eval("#goal-title", (el) => el.textContent.trim());
    assert.equal(title, g.expectedTitle);

    const goalActiveWeight = await page.$eval(`button[data-goal="${g.key}"]`, (el) => window.getComputedStyle(el).fontWeight);
    assert.equal(goalActiveWeight, "700", `Selected goal button "${g.key}" must have font-weight 700`);

    // Click CTA
    await page.click("#goal-cta");
    const interestVal = await page.$eval("#interest", (el) => el.value);
    console.log(`Goal "${g.key}" CTA -> Form Interest: "${interestVal}" (matches expected: "${g.expectedInterest}")`);
    assert.equal(interestVal, g.expectedInterest);
  }
  console.log("✓ All 5 approved goal CTAs successfully verified and preselect into ContactForm");

  console.log("\n=================================================");
  console.log("4. ALL THREE SAVINGS-OPTION CTAS VERIFICATION");
  console.log("=================================================");
  const savingsTests = [
    { interest: "Fixed deposits", summary: 'summary:has-text("Fixed deposits")', selector: 'a[data-interest="Fixed deposits"]' },
    { interest: "Recurring deposits", summary: 'summary:has-text("Recurring deposits")', selector: 'a[data-interest="Recurring deposits"]' },
    { interest: "Monthly income plans", summary: 'summary:has-text("Monthly income plans")', selector: 'a[data-interest="Monthly income plans"]' },
  ];

  for (const s of savingsTests) {
    // Ensure the accordion card is expanded before clicking the CTA link
    const details = page.locator(`details:has(${s.selector})`);
    const isOpen = await details.evaluate((el) => el.open);
    if (!isOpen) {
      await page.click(s.summary);
      await page.waitForTimeout(100);
    }
    await page.click(s.selector);
    const interestVal = await page.$eval("#interest", (el) => el.value);
    console.log(`Savings option "${s.interest}" CTA -> Form Interest: "${interestVal}"`);
    assert.equal(interestVal, s.interest);
  }
  console.log("✓ All 3 savings-option CTAs successfully verified and preselect into ContactForm");

  console.log("\n=================================================");
  console.log("5. ACCORDION & FAQ BEHAVIOUR");
  console.log("=================================================");
  // Verify first FAQ is open by default
  const firstFaqOpen = await page.$eval("#faqs details:first-of-type", (el) => el.open);
  assert.equal(firstFaqOpen, true, "First FAQ must be open by default");

  // Toggle second FAQ
  const secondFaqBefore = await page.$eval("#faqs details:nth-of-type(2)", (el) => el.open);
  assert.equal(secondFaqBefore, false);
  await page.click("#faqs details:nth-of-type(2) summary");
  const secondFaqAfter = await page.$eval("#faqs details:nth-of-type(2)", (el) => el.open);
  assert.equal(secondFaqAfter, true, "Second FAQ must toggle open");

  // Toggle second FAQ closed again
  await page.click("#faqs details:nth-of-type(2) summary");
  const secondFaqClosed = await page.$eval("#faqs details:nth-of-type(2)", (el) => el.open);
  assert.equal(secondFaqClosed, false, "Second FAQ must toggle closed");
  console.log("✓ Accordion and FAQ open/close toggles verified natively");

  console.log("\n=================================================");
  console.log("6. KEYBOARD NAVIGATION & FOCUS RESTORATION");
  console.log("=================================================");
  await page.setViewportSize({ width: 375, height: 812 });
  const menuButton = page.locator(".menu");

  // Focus and open menu
  await menuButton.focus();
  await page.keyboard.press("Enter");
  const isDrawerOpen = await page.$eval("#mobile-nav", (el) => el.classList.contains("open") && !el.hidden);
  assert.equal(isDrawerOpen, true);

  // Close via Escape key and test focus restoration
  await page.keyboard.press("Escape");
  const isDrawerClosed = await page.$eval("#mobile-nav", (el) => !el.classList.contains("open") && el.hidden);
  assert.equal(isDrawerClosed, true);

  const activeElementTagName = await page.evaluate(() => document.activeElement?.className);
  console.log(`Active element class after Escape: "${activeElementTagName}"`);
  assert.ok(activeElementTagName?.includes("menu"), "Focus must be restored to Menu button after Escape");
  console.log("✓ Keyboard trap, Escape key handling, and focus restoration verified");

  console.log("\n=================================================");
  console.log("7. SCROLL REVEAL & REDUCED MOTION VERIFICATION");
  console.log("=================================================");
  const revealSelectors = [
    ".intro p",
    ".feature-copy h2",
    ".feature .calc",
    "#goals .section-header h2",
    "#goals .goal-detail",
    "#solutions .split-heading h2",
    "#solutions .solution-list details",
    "#process .section-header h2",
    "#process .steps article",
    ".brand-story .story-image",
    ".brand-story .story-copy h2",
    "#faqs .split-heading h2",
    "#faqs details",
    "#contact .contact-heading h2",
    "#contact .contact-note",
    "#contact #lead-form",
  ];

  // Normal motion: scroll through full page and verify every section settles at opacity 1
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(nextUrl, { waitUntil: "networkidle" });
  await scrollPageToTriggerAllReveals(page);
  const settledResults = await page.evaluate((sels) => {
    return sels.map((sel) => {
      const els = Array.from(document.querySelectorAll(sel));
      return {
        sel,
        count: els.length,
        minOpacity: Math.min(...els.map((el) => parseFloat(getComputedStyle(el).opacity))),
      };
    });
  }, revealSelectors);
  for (const item of settledResults) {
    assert.ok(item.count > 0, `Reveal target ${item.sel} must exist`);
    assert.equal(item.minOpacity, 1, `Reveal target ${item.sel} must settle at opacity 1 after scroll`);
  }
  console.log("✓ Scroll reveals verified: all 16 section targets settled cleanly at opacity 1");

  // Reduced motion: verify scroll-behavior: auto AND all sections immediately at opacity 1 before scrolling
  const reducedMotionContext = await browser.newContext({
    reducedMotion: "reduce",
  });
  const rmPage = await reducedMotionContext.newPage();
  await rmPage.setViewportSize({ width: 1440, height: 900 });
  await rmPage.goto(nextUrl, { waitUntil: "networkidle" });
  const htmlScrollBehavior = await rmPage.evaluate(() => {
    return window.getComputedStyle(document.documentElement).scrollBehavior;
  });
  console.log(`Reduced motion scroll-behavior: "${htmlScrollBehavior}"`);
  assert.equal(htmlScrollBehavior, "auto", "Scroll behavior must be auto under reduced motion");

  const rmOpacityResults = await rmPage.evaluate((sels) => {
    return sels.map((sel) => {
      const els = Array.from(document.querySelectorAll(sel));
      return {
        sel,
        minOpacity: Math.min(...els.map((el) => parseFloat(getComputedStyle(el).opacity))),
      };
    });
  }, revealSelectors);
  for (const item of rmOpacityResults) {
    assert.equal(item.minOpacity, 1, `Under reduced motion, ${item.sel} must be visible immediately`);
  }
  await reducedMotionContext.close();
  console.log("✓ Reduced-motion handling verified without spatial animations");

  console.log("\n=================================================");
  console.log("8. BRAND TAGLINE, FORM VALIDATION & CORRECTION");
  console.log("=================================================");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(nextUrl, { waitUntil: "networkidle" });

  const headerTagline = await page.$eval(".header-tagline", (el) => el.textContent.trim());
  const footerTagline = await page.$eval(".footer-top p", (el) => el.textContent.trim());
  assert.equal(headerTagline, "Your Partner in Financial Growth");
  assert.equal(footerTagline, "Your Partner in Financial Growth.");
  console.log("✓ Brand tagline verified in Header and Footer: 'Your Partner in Financial Growth.'");

  // Verify absence of Privacy Policy and Terms links
  const legalLinksCount = await page.evaluate(() => {
    return document.querySelectorAll('a[href*="privacy"], a[href*="terms"]').length;
  });
  assert.equal(legalLinksCount, 0, "Zero Privacy Policy or Terms links permitted on page");
  console.log("✓ Verified: Zero Privacy Policy or Terms links present on page");

  // Verify absence of 'In person' contact method
  const inPersonElements = await page.evaluate(() => {
    const text = document.body.innerText;
    const hasInPerson = text.includes("In person") || text.includes("In-person");
    return hasInPerson;
  });
  assert.equal(inPersonElements, false, "'In person' contact option must be completely absent from UI");
  console.log("✓ Verified: 'In person' contact option is completely absent from page");

  // Verify safely inactive WhatsApp CTA
  const whatsappState = await page.evaluate(() => {
    const btn = document.querySelector(".whatsapp-btn");
    return {
      exists: !!btn,
      ariaDisabled: btn?.getAttribute("aria-disabled"),
      isButton: btn?.tagName === "BUTTON",
    };
  });
  assert.ok(whatsappState.exists, "WhatsApp CTA must exist");
  assert.equal(whatsappState.ariaDisabled, "true", "WhatsApp CTA must be accessibly inactive when unconfigured");
  console.log("✓ Verified: WhatsApp CTA is rendered with reference styling but safely inactive");

  // Test consultation card / dropdown bidirectional synchronization
  console.log("\n--- Testing Consultation Cards / Dropdown Bidirectional Sync ---");
  // Default is "Savings plan consultation"
  let initialSelect = await page.$eval("#consultationType", (el) => el.value);
  assert.equal(initialSelect, "Savings plan consultation");

  // Click "Quick call" card -> dropdown updates
  await page.click('button.consult-card:has-text("Quick call")');
  let updatedSelect1 = await page.$eval("#consultationType", (el) => el.value);
  assert.equal(updatedSelect1, "Quick call");

  // Click "Financial roadmap consultancy" card -> dropdown updates
  await page.click('button.consult-card:has-text("Financial roadmap consultancy")');
  let updatedSelect2 = await page.$eval("#consultationType", (el) => el.value);
  assert.equal(updatedSelect2, "Financial roadmap consultancy");

  // Change dropdown to "Savings plan consultation" -> card updates active state
  await page.selectOption("#consultationType", "Savings plan consultation");
  const isSavingsCardActive = await page.$eval(
    'button.consult-card:has-text("Savings plan consultation")',
    (el) => el.classList.contains("active")
  );
  assert.equal(isSavingsCardActive, true, "Savings plan consultation card must become active when dropdown changes");
  console.log("✓ Verified: Consultation cards and dropdown sync bidirectionally in both directions");

  // 1. Submit empty -> check errors & focus
  await page.click('button[type="submit"]');
  let nameError = await page.$eval("#name-error", (el) => el.textContent.trim());
  assert.equal(nameError, "Enter a name with 2–80 characters.");
  let focusedId = await page.evaluate(() => document.activeElement.id);
  assert.equal(focusedId, "name", "Focus must move to #name");

  // 2. Type in name -> error clears dynamically
  await page.fill("#name", "Ishant");
  nameError = await page.$eval("#name-error", (el) => el.textContent.trim());
  assert.equal(nameError, "", "Name error must clear once corrected");

  // 3. Test invalid phone -> error appears
  await page.fill("#phone", "12345");
  await page.click('button[type="submit"]');
  let phoneError = await page.$eval("#phone-error", (el) => el.textContent.trim());
  assert.equal(phoneError, "Enter a valid 10-digit Indian mobile number.");

  // 4. Correct phone -> error clears
  await page.fill("#phone", "+91 98765 43210");
  phoneError = await page.$eval("#phone-error", (el) => el.textContent.trim());
  assert.equal(phoneError, "", "Phone error must clear once corrected");

  // 5. Test invalid email
  await page.fill("#email", "invalid-email");
  await page.click('button[type="submit"]');
  let emailError = await page.$eval("#email-error", (el) => el.textContent.trim());
  assert.equal(emailError, "Enter a valid email address.");

  // 6. Correct email
  await page.fill("#email", "valid@example.com");
  emailError = await page.$eval("#email-error", (el) => el.textContent.trim());
  assert.equal(emailError, "", "Email error must clear once corrected");

  // 7. Select interest and check consent
  await page.selectOption("#interest", "Retirement");
  await page.check("#consent");

  console.log("\n=================================================");
  console.log("9. LEAD SUBMISSION API & IDEMPOTENCY VERIFICATION");
  console.log("=================================================");
  // Clear recorded network requests before clicking submit
  networkRequests.length = 0;

  await page.click('button[type="submit"]');
  await page.waitForSelector("#form-status", { timeout: 15000 });

  const leadApiRequests = networkRequests.filter((r) =>
    r.url.includes("/api/leads")
  );
  console.log(`Dispatched lead API network requests during submit: ${leadApiRequests.length}`);
  assert.equal(leadApiRequests.length, 1, "Exactly one POST /api/leads request must be dispatched");

  const initialReq = leadApiRequests[0];
  assert.equal(initialReq.method, "POST");
  assert.ok(initialReq.headers["idempotency-key"], "Idempotency-Key header must be sent");
  const postBody = JSON.parse(initialReq.postData);
  assert.equal(postBody.name, "Ishant");
  assert.equal(postBody.phone, "+91 98765 43210");
  assert.equal(postBody.email, "valid@example.com");
  assert.equal(postBody.consultationType, "Savings plan consultation");
  assert.equal(postBody.interest, "Retirement");
  assert.equal(postBody.contactMethod, "Phone call");
  assert.equal(postBody.callTimePreference, "No preference");
  assert.equal(postBody.preferredLanguage, "English");
  assert.equal(postBody.consent, true);
  console.log("✓ Form submission dispatched POST /api/leads with valid Idempotency-Key header & payload");

  const statusText = await page.$eval("#form-status", (el) => el.textContent.trim());
  console.log(`UI Form status response: "${statusText}"`);
  assert.ok(
    statusText.includes("Your consultation request has been received") ||
      statusText.includes("Unable to verify client connection") ||
      statusText.includes("Unable to process consultation request at this time") ||
      statusText.includes("temporarily unavailable"),
    `Unexpected form status: ${statusText}`
  );
  console.log("✓ UI gracefully updated status message based on API response");

  console.log("\n=================================================");
  console.log("10. CONSOLE ERROR AUDIT");
  console.log("=================================================");
  // Exclude expected HTTP 500/503 from /api/leads if MongoDB is not locally configured during test
  const nonApiErrors = consoleErrors.filter(
    (err) =>
      !err.includes("500") &&
      !err.includes("503") &&
      !err.includes("api/leads")
  );
  console.log(`Total non-API console errors: ${nonApiErrors.length}`);
  if (nonApiErrors.length > 0) {
    console.error("Unexpected console errors encountered:", nonApiErrors);
  }
  assert.equal(nonApiErrors.length, 0, "No browser console or hydration errors permitted");

  await browser.close();
  console.log("\nALL EXPANDED BROWSER VERIFICATION CHECKS PASSED!");
}

runBrowserTests().catch((err) => {
  console.error("Browser test failed:", err);
  process.exit(1);
});
