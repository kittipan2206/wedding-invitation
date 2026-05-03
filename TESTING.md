# Testing Plan — Wedding Invitation

## Overview

```
Vitest        → unit tests: pure logic, DOM injection, validation
Playwright    → E2E tests: user flows, network mocking, multi-page
GitHub Actions → CI pipeline: Vitest on every push + Playwright vs Vercel Preview URL
```

---

## Phase 1 — Vitest Unit Tests

**Goal:** Install Vitest, write tests for pure logic functions  
**Estimate:** 2–3 hours  
**Value:** Catches logic regressions instantly, no browser required

### 1.1 Install

```bash
npm install -D vitest @vitest/coverage-v8 happy-dom
```

### 1.2 Add `test` block to `vite.config.js`

```javascript
test: {
  environment: "happy-dom",
  globals: true,
  setupFiles: ["./tests/setup.js"],
  include: ["tests/unit/**/*.test.js"],
  define: {
    __LOCAL_MUSIC__: JSON.stringify([]),  // prevent ReferenceError from Vite plugin
  },
  coverage: {
    provider: "v8",
    include: ["src/js/**/*.js"],
    exclude: [
      "src/js/music.js",
      "src/js/petals.js",
      "src/js/cursor-sparkle.js",
      "src/js/confetti.js",
      "src/js/parallax.js",
      "src/js/scroll-nav.js",
      "src/js/reveal.js",
      "src/js/fullscreen.js",
      "src/js/card-export.js",
    ],
    reporter: ["text", "html"],
    thresholds: { lines: 70, functions: 70 },
  },
},
```

### 1.3 Add scripts to `package.json`

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

### 1.4 Create `tests/setup.js`

```javascript
import { beforeEach, vi } from "vitest";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  delete window.__weddingConfig;
  global.fetch = vi.fn();
});
```

### 1.5 Files to unit test

| File | Functions | Priority |
|------|-----------|----------|
| `config.js` | `normalizeConfigValues`, `injectConfig`, `fetchConfig` | High |
| `countdown.js` | tick logic, ended state, display | High |
| `typewriter.js` | char-by-char output, fake timers | High |
| `rsvp.js` | required field validation, guest count | High |
| `guestbook.js` | `escHtml`, render entry, feed | Medium |
| `admin.js` | `normalizeConfigValue`, `escHtml`, `buildMusicOptions` | Medium |
| `share.js` | URL building, clipboard mock | Low |

### 1.6 Folder structure

```
tests/
  setup.js
  unit/
    config.test.js
    countdown.test.js
    typewriter.test.js
    rsvp-validation.test.js
    guestbook-render.test.js
    admin-helpers.test.js
```

### 1.7 Example patterns

```javascript
// tests/unit/config.test.js
import { describe, it, expect } from "vitest";
import { injectConfig } from "../../src/js/config.js";

describe("injectConfig", () => {
  beforeEach(() => {
    document.body.innerHTML = `<div class="hero-names"></div><div id="footer-names"></div>`;
  });

  it("falls back to defaults when cfg is null", () => {
    injectConfig(null);
    expect(window.__weddingConfig.groom_name).toBe("นนท์");
  });

  it("injects couple names into .hero-names", () => {
    injectConfig({ groom_name: "Test", bride_name: "Bride" });
    expect(document.querySelector(".hero-names").innerHTML).toContain("Test");
  });
});
```

```javascript
// tests/unit/countdown.test.js
it("shows #countdown-ended when event date has passed", () => {
  window.__weddingConfig = { event_date_iso: "2020-01-01", event_time_ceremony: "10:00" };
  // setup DOM...
  initCountdown();
  expect(document.getElementById("countdown-ended").style.display).toBe("flex");
});
```

### 1.8 Run

```bash
npm test                  # run once
npm run test:watch        # watch mode during development
npm run test:coverage     # with coverage report
```

---

## Phase 2 — Playwright E2E Tests

**Goal:** Test real user flows in a browser, mock GAS API responses  
**Estimate:** 3–4 hours  
**Value:** Catches bugs unit tests miss — animations, form flows, localStorage state, edge cases

### 2.1 Install

```bash
npm install -D @playwright/test
npx playwright install chromium
```

### 2.2 Create `playwright.config.js`

```javascript
import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 14"] } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:5173",
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      },
});
```

### 2.3 Add scripts to `package.json`

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:e2e:debug": "playwright test --debug"
```

### 2.4 GAS Mock Helper (reuse across all tests)

```javascript
// tests/e2e/helpers/mock-gas.js
export async function mockGAS(page, overrides = {}) {
  await page.route("**/script.google.com/**", async (route) => {
    const url = route.request().url();
    if (url.includes("type=config")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          groom_name: "นนท์", bride_name: "เมย์",
          event_date_iso: "2026-03-15", event_time_ceremony: "11:00",
          event_time_lunch: "12:00",
          venue_name: "ตำบลแป-ระ อำเภอท่าแพ จังหวัดสตูล",
          dress_code: "Pastel Formal",
          rsvp_deadline_display: "28 กุมภาพันธ์ 2569",
          music_url: "",
          ...overrides.config,
        }),
      });
    } else if (url.includes("type=guestbook_all")) {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify(overrides.guestbook ?? []),
      });
    } else if (url.includes("type=photos_all")) {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify(overrides.photos ?? []),
      });
    } else {
      await route.fulfill({ status: 200, body: "" }); // POST no-cors
    }
  });
}
```

### 2.5 E2E Test Coverage

**`tests/e2e/index.test.js`** — Homepage
```
✓ Page loads without console errors
✓ ?to=NAME shows guest name
✓ ?goto=rsvp skips envelope animation
✓ Envelope opens on click
✓ Couple names display correctly from config
✓ Countdown shows correct values / ended state
✓ Detail cards show date, time, venue
✓ Mobile layout does not break (375px)
```

**`tests/e2e/rsvp.test.js`** — RSVP Form
```
✓ Submits form successfully → thank-you screen appears
✓ GAS payload has correct name / count / attendance
✓ Validates required fields before submit
✓ Shows thank-you immediately if already submitted (localStorage)
✓ Hides form if past RSVP deadline
✓ Prevents double submit (button disabled after first click)        ← edge case
✓ Thai characters and special chars in name send without breaking   ← edge case
✓ Handles GAS timeout / no response gracefully (error state shown)  ← edge case
```

**`tests/e2e/guestbook.test.js`** — Guestbook
```
✓ Submits message → optimistic prepend to feed
✓ GAS payload is correct
✓ Escapes HTML in guestbook feed (XSS prevention)
✓ Loads feed from GAS mock and renders correctly
✓ Prevents double submit                                            ← edge case
✓ Thai + special chars in message render correctly                  ← edge case
```

**`tests/e2e/pages.test.js`** — Other pages
```
✓ card.html loads, shows couple names
✓ gallery.html loads, no crash when photos array is empty
✓ display.html loads without errors
✓ admin.html loads, shows auth screen
```

**`tests/e2e/admin.test.js`** — Admin Panel
```
✓ Wrong password → error message shown
✓ Correct password → panel visible
✓ Tab switching works (event, gallery, rsvp, guestbook, music)
✓ Event Info save → toast appears
✓ Music tab → mode switching (library / URL / upload)
```

### 2.6 Edge Cases (must cover)

| Scenario | Test location | How to simulate |
|----------|---------------|-----------------|
| **Slow network / 3G** | `index.test.js`, `rsvp.test.js` | `page.route()` with delay: `await new Promise(r => setTimeout(r, 3000)); route.fulfill(...)` |
| **GAS timeout / no response** | `rsvp.test.js`, `guestbook.test.js` | `route.abort("timedout")` — check error state renders |
| **GAS returns 500** | `rsvp.test.js` | `route.fulfill({ status: 500, body: "" })` — check graceful fallback |
| **Thai + special chars in RSVP** | `rsvp.test.js` | Fill name with `สมชาย & "ใจดี" <test>` — verify payload and UI |
| **Double submit** | `rsvp.test.js`, `guestbook.test.js` | Click submit twice rapidly — verify only one request sent |
| **Back button mid-flow** | `rsvp.test.js` | `page.goBack()` after starting form — verify state doesn't break |
| **iOS Safari / mobile** | All test files | Use `devices["iPhone 14"]` project in playwright.config.js |
| **Audio autoplay block** | `index.test.js` | Chromium blocks autoplay by default — verify player shows paused state, not crash |

```javascript
// Example: slow network simulation
await page.route("**/script.google.com/**", async (route) => {
  await new Promise((r) => setTimeout(r, 4000)); // simulate 3G delay
  await route.fulfill({ status: 200, body: JSON.stringify(mockConfig) });
});
await page.goto("/");
// loading state should be visible, then resolve without crash
await expect(page.locator(".loader")).toBeVisible();
await expect(page.locator(".hero-names")).toBeVisible({ timeout: 10_000 });
```

```javascript
// Example: GAS no response
await page.route("**/script.google.com/**", (route) => route.abort("timedout"));
await page.fill("#guest-name", "ทดสอบ");
await page.click('button[type="submit"]');
// should show error toast or fallback, not hang forever
await expect(page.locator(".toast--error")).toBeVisible();
```

```javascript
// Example: double submit prevention
await page.fill("#guest-name", "สมชาย");
await page.click('button[type="submit"]');
await page.click('button[type="submit"]'); // second click
const requests = [];
page.on("request", (req) => {
  if (req.url().includes("script.google.com")) requests.push(req);
});
expect(requests.length).toBe(1); // only one request should be sent
```

### 2.7 Run

```bash
npm run test:e2e          # headless
npm run test:e2e:ui       # Playwright UI (recommended for debugging)
npm run test:e2e:debug    # step-by-step
```

---

## Phase 3 — CI/CD Pipeline (GitHub Actions)

**Goal:** Run tests automatically on every push to develop/main  
**Estimate:** 1 hour  
**Value:** Catches bugs before production deploy, Playwright runs against real Vercel Preview URL

### 3.1 GitHub Secrets required

Go to: GitHub repo → Settings → Secrets and variables → Actions

| Secret | Where to find |
|--------|---------------|
| `VERCEL_TOKEN` | vercel.com → Account Settings → Tokens |
| `VERCEL_ORG_ID` | `.vercel/project.json` → `"orgId"` |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` → `"projectId"` |

### 3.2 Create `.github/workflows/test.yml`

```yaml
name: Tests

on:
  push:
    branches: [develop, main]
  pull_request:

jobs:
  unit:
    name: Vitest Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run test:coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/

  e2e:
    name: Playwright E2E
    runs-on: ubuntu-latest
    needs: unit
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npx playwright install --with-deps chromium

      - name: Deploy to Vercel Preview
        id: vercel
        run: |
          npm install -g vercel
          URL=$(vercel --token ${{ secrets.VERCEL_TOKEN }} --yes 2>&1 | tail -1)
          echo "url=$URL" >> $GITHUB_OUTPUT
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Run E2E against Vercel Preview
        run: npm run test:e2e
        env:
          PLAYWRIGHT_BASE_URL: ${{ steps.vercel.outputs.url }}

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### 3.3 Pipeline flow

```
git push develop
       ↓
GitHub Actions triggered
       ↓
Job 1: Vitest unit tests (~30s, no browser needed)
       ↓ pass
Job 2: Deploy to Vercel Preview → get preview URL
       ↓
Playwright E2E against Preview URL
       ↓
Upload artifacts on failure (screenshots + traces)
```

---

## Checklist

### Phase 1 — Vitest
- [ ] `npm install -D vitest @vitest/coverage-v8 happy-dom`
- [ ] Add `test:` block to `vite.config.js`
- [ ] Add scripts to `package.json`
- [ ] Create `tests/setup.js`
- [ ] Write unit tests (config, countdown, typewriter, rsvp-validation, guestbook-render)
- [ ] `npm run test:coverage` passes 70% threshold

### Phase 2 — Playwright
- [ ] `npm install -D @playwright/test && npx playwright install chromium`
- [ ] Create `playwright.config.js`
- [ ] Add scripts to `package.json`
- [ ] Create `tests/e2e/helpers/mock-gas.js`
- [ ] Write E2E tests (index, rsvp, guestbook, pages, admin)
- [ ] Write edge case tests (slow network, timeout, double submit, Thai chars, back button)
- [ ] `npm run test:e2e` all pass

### Phase 3 — CI/CD
- [ ] Add GitHub Secrets (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID)
- [ ] Create `.github/workflows/test.yml`
- [ ] Push to develop → Actions run successfully

---

## Files excluded from testing

| File | Reason |
|------|--------|
| `petals.js` | Pure animation loop, no testable logic |
| `confetti.js` | Pure animation |
| `cursor-sparkle.js` | Mouse event + animation only |
| `parallax.js` | Scroll event + CSS transform only |
| `scroll-nav.js` | Scroll event only |
| `reveal.js` | IntersectionObserver only |
| `fullscreen.js` | Browser API wrapper only |
| `card-export.js` | html2canvas wrapper |
| `music.js` | Audio API — cover with Playwright instead of unit tests |
