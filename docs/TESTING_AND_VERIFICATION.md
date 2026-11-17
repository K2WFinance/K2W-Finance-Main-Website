# K2WFINANCE — Testing and Verification Guide

This document describes the reproducible setup for running unit, integration, and end-to-end browser verification for the K2WFINANCE Next.js landing page.

---

## 1. Prerequisites
- **Node.js:** `>= 20.9.0` (Verified on Node.js `v24.15.0`).
- **npm:** `>= 10.0.0` (Verified on npm `11.12.1`).
- **Browser:** Google Chrome (Installed at `/Applications/Google Chrome.app` on macOS, or accessible in `$PATH`).
- **Dependencies:** All testing packages (`playwright-core`, `tsx`, `typescript`, `eslint`) are declared locally in `package.json`.

---

## 2. Server Startup & Verification Workflow

### Step A: Build Next.js Production Bundle
```bash
npm run build
```
Confirms clean TypeScript compilation and Turbopack static page generation (`○ /`).

### Step B: Start Next.js Production Server (Port 3000)
```bash
npm run start -- -p 3000
```
Runs the compiled Next.js application at `http://localhost:3000`.

### Step C: Start Original HTML Prototype Server (Port 3001)
In a separate terminal:
```bash
python3 -m http.server 3001 --directory ./k2wfinance-ui
```
Serves the approved static prototype reference at `http://localhost:3001/index.html`.

---

## 3. Running Automated Tests

### 1. Calculation & Attribution Unit Tests
```bash
npx tsx scripts/test-verification.mjs
```
**What it verifies:**
- **Production Calculator Functions:** Directly imports `calculateValues` from `src/lib/calculator.ts` without duplicating math. Tests prototype defaults (₹14,69,328 for lump sum, ₹7,34,769 for monthly, ₹6,667 for income).
- **Zero-Rate Calculations:** Confirms zero-rate edge cases (`rate = 0`) across all three calculator modes.
- **Boundary Values:** Tests minimum and maximum constraints for starting amounts, contribution ranges, annual rates (1% to 15%), and tenures (1 to 15 years).
- **UTM Attribution Isolation:** Confirms `UTM_COLLECTION_ENABLED = false` and allowlist is empty. Tests value sanitization, trimming, 200-char length limits, unknown stored key rejection on both read and write, malformed JSON recovery, blocked storage simulation, clean-URL fallback, and preservation after demo validation.

### 2. Expanded Browser & Responsive Verification Tests
```bash
node scripts/browser-verify.mjs
```
**What it verifies:**
- **Zero Horizontal Overflow:** Evaluates `document.documentElement.scrollWidth <= document.documentElement.clientWidth` at 375px, 390px, 414px, 768px, and 1440px.
- **Whole-Page Parity:** Scrolls through the entire page on both the Next.js app and prototype, allowing GSAP ScrollTriggers to complete before capturing full-page comparison screenshots.
- **Calculator Sliders & Font Weights:** Interacts with amount, rate, and tenure sliders. Verifies dynamic calculation updates and validates that monetary and percentage values maintain `fontWeight === "700"`.
- **All 5 Goal CTAs:** Selects each of the five goals (`income`, `vehicle`, `home`, `education`, `retirement`), clicks its CTA, and verifies that the consultation form's dropdown updates to that exact goal.
- **All 3 Savings-Option CTAs:** Clicks CTAs for `Fixed deposits`, `Recurring deposits`, and `Monthly income plans`, verifying that the dropdown updates accordingly.
- **Accordion & FAQ Toggles:** Tests native `<details>` and `<summary>` open and close states.
- **Keyboard Navigation & Focus Restoration:** Tests focus trapping inside the mobile menu drawer and verifies that pressing Escape closes the drawer and restores focus directly to the Menu button.
- **Reduced Motion:** Emulates `prefers-reduced-motion: reduce` and verifies static presentation without spatial animations or console errors.
- **Form Field Correction Dynamics:** Tests empty submission, first-invalid focus on `#name`, specific validation messages, and verifies that correcting each field clears its error immediately.
- **Absence of Lead Network Requests:** Monitors all browser network traffic during form submission to guarantee that zero requests are dispatched to external APIs, mock endpoints, or webhooks.
- **Zero Console / Hydration Errors:** Audits browser console logs for zero errors.

---

## 4. Visual Comparison Artifacts
Full-page screenshots comparing the Next.js implementation with the prototype at all required viewports are saved in:
`docs/screenshots/`
- `nextjs-mobile-375-full.png` vs `prototype-mobile-375-full.png`
- `nextjs-mobile-390-full.png` vs `prototype-mobile-390-full.png`
- `nextjs-mobile-414-full.png` vs `prototype-mobile-414-full.png`
- `nextjs-tablet-768-full.png` vs `prototype-tablet-768-full.png`
- `nextjs-desktop-1440-full.png` vs `prototype-desktop-1440-full.png`
