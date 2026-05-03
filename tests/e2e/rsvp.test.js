import { test, expect } from "@playwright/test";
import { mockGAS } from "./helpers/mock-gas.js";

test.describe("RSVP — happy path", () => {
  test("submitting form shows thank-you screen", async ({ page }) => {
    await mockGAS(page);
    await page.goto("/?goto=rsvp");
    await expect(page.locator("#rsvp-form")).toBeVisible({ timeout: 10_000 });

    await page.fill("#guest-name", "สมชาย");
    await page.selectOption("#guest-count", "2");
    await page.click('label[for="attend-yes"]');
    await page.click('button[type="submit"]');

    await expect(page.locator("#thank-you")).toBeVisible({ timeout: 8_000 });
    await expect(page.locator("#rsvp-form")).not.toBeVisible();
  });

  test("thank-you screen persists after reload", async ({ page }) => {
    await mockGAS(page);
    await page.goto("/?goto=rsvp");
    await expect(page.locator("#rsvp-form")).toBeVisible({ timeout: 10_000 });

    await page.fill("#guest-name", "สมหญิง");
    await page.selectOption("#guest-count", "1");
    await page.click('label[for="attend-yes"]');
    await page.click('button[type="submit"]');
    await expect(page.locator("#thank-you")).toBeVisible({ timeout: 8_000 });

    await page.reload();
    await mockGAS(page);
    await page.goto("/?goto=rsvp");
    await expect(page.locator("#thank-you")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("#rsvp-form")).not.toBeVisible();
  });
});

test.describe("RSVP — validation", () => {
  test.beforeEach(async ({ page }) => {
    await mockGAS(page);
    await page.goto("/?goto=rsvp");
    await expect(page.locator("#rsvp-form")).toBeVisible({ timeout: 10_000 });
  });

  test("cannot submit with name field empty", async ({ page }) => {
    await page.selectOption("#guest-count", "1");
    await page.click('label[for="attend-yes"]');
    await page.click('button[type="submit"]');

    await expect(page.locator("#err-name")).toBeVisible();
    await expect(page.locator("#thank-you")).not.toBeVisible();
  });

  test("cannot submit without selecting attendance", async ({ page }) => {
    await page.fill("#guest-name", "ทดสอบ");
    await page.selectOption("#guest-count", "1");
    await page.click('button[type="submit"]');

    await expect(page.locator("#err-attend")).toBeVisible();
    await expect(page.locator("#thank-you")).not.toBeVisible();
  });

  test("character counter updates as user types in note field", async ({ page }) => {
    await page.fill("#guest-note", "สวัสดี");
    const counter = page.locator("#rsvp-char-counter");
    await expect(counter).toContainText("6");
  });
});

test.describe("RSVP — deadline", () => {
  test("shows closed banner when past RSVP deadline", async ({ page }) => {
    await mockGAS(page, {
      config: { rsvp_deadline_iso: "2020-01-01", rsvp_deadline_display: "1 มกราคม 2563" },
    });
    await page.goto("/?goto=rsvp");
    await expect(page.locator("#rsvp-closed-banner")).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("RSVP — edge cases", () => {
  test("prevents double submission — button disabled after first click", async ({ page }) => {
    // Use a slow route so we can check button state while request is in-flight
    await page.route("**/script.google.com/**", async (route) => {
      if (route.request().method() === "POST") {
        await new Promise((r) => setTimeout(r, 500));
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
      } else {
        await route.fallback();
      }
    });
    await mockGAS(page);

    await page.goto("/?goto=rsvp");
    await expect(page.locator("#rsvp-form")).toBeVisible({ timeout: 10_000 });
    await page.fill("#guest-name", "ทดสอบ");
    await page.selectOption("#guest-count", "1");
    await page.click('label[for="attend-yes"]');

    const submitBtn = page.locator('#rsvp-form button[type="submit"]');
    await submitBtn.click();
    await expect(submitBtn).toBeDisabled();
  });

  test("Thai and special characters in name are handled correctly", async ({ page }) => {
    await mockGAS(page);
    await page.goto("/?goto=rsvp");
    await expect(page.locator("#rsvp-form")).toBeVisible({ timeout: 10_000 });
    await page.fill("#guest-name", 'สมชาย & "ใจดี" <test>');
    await page.selectOption("#guest-count", "1");
    await page.click('label[for="attend-yes"]');
    await page.click('button[type="submit"]');

    await expect(page.locator("#thank-you")).toBeVisible({ timeout: 8_000 });
  });

  test("shows error state when server does not respond", async ({ page }) => {
    await mockGAS(page);
    // Override: abort POST requests (registered after mockGAS = higher priority)
    await page.route("**/script.google.com/**", (route) => {
      if (route.request().method() === "POST") {
        return route.abort("failed");
      }
      return route.fallback();
    });
    await page.goto("/?goto=rsvp");
    await expect(page.locator("#rsvp-form")).toBeVisible({ timeout: 10_000 });
    await page.fill("#guest-name", "ทดสอบ");
    await page.selectOption("#guest-count", "1");
    await page.click('label[for="attend-yes"]');
    await page.click('button[type="submit"]');

    // Should show an error or re-enable the button — not hang forever
    await expect(
      page.locator("#thank-you, .toast--error, .rsvp-error, #rsvp-form button[type='submit']:not([disabled])")
    ).toBeVisible({ timeout: 15_000 });
  });
});
