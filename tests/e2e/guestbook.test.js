import { test, expect } from "@playwright/test";
import { mockGAS } from "./helpers/mock-gas.js";

test.describe("Guestbook — happy path", () => {
  test("submitting a message shows it in the feed and thank-you state", async ({ page }) => {
    await mockGAS(page);
    await page.goto("/?goto=guestbook");
    await expect(page.locator("#guestbook-form")).toBeVisible({ timeout: 10_000 });

    await page.fill("#gb-name", "สมชาย");
    await page.fill("#gb-message", "ขอให้รักกันยาวนาน!");
    await page.click('#guestbook-form button[type="submit"]');

    await expect(page.locator("#guestbook-thanks")).toBeVisible({ timeout: 8_000 });
  });

  test("submitted message appears in the feed (optimistic update)", async ({ page }) => {
    await mockGAS(page);
    await page.goto("/?goto=guestbook");
    await expect(page.locator("#guestbook-form")).toBeVisible({ timeout: 10_000 });

    await page.fill("#gb-name", "สมหญิง");
    await page.fill("#gb-message", "ยินดีด้วยนะ ♡");
    await page.click('#guestbook-form button[type="submit"]');

    await expect(page.locator("#guestbook-feed")).toContainText("ยินดีด้วยนะ", { timeout: 8_000 });
  });

  test("existing messages from server are rendered in feed", async ({ page }) => {
    await mockGAS(page, {
      guestbook: [
        { name: "แขกคนแรก", message: "ขอให้มีความสุข", ts: "2026-01-01T00:00:00Z", visible: true },
        { name: "แขกคนสอง", message: "สวย มากเลย", ts: "2026-01-02T00:00:00Z", visible: true },
      ],
    });
    await page.goto("/?goto=guestbook");
    await expect(page.locator("#guestbook-feed")).toContainText("แขกคนแรก", { timeout: 10_000 });
    await expect(page.locator("#guestbook-feed")).toContainText("แขกคนสอง");
  });
});

test.describe("Guestbook — validation", () => {
  test.beforeEach(async ({ page }) => {
    await mockGAS(page);
    await page.goto("/?goto=guestbook");
    await expect(page.locator("#guestbook-form")).toBeVisible({ timeout: 10_000 });
  });

  test("cannot submit with name field empty", async ({ page }) => {
    await page.fill("#gb-message", "คำอวยพร");
    await page.click('#guestbook-form button[type="submit"]');
    await expect(page.locator("#gb-err-name")).toBeVisible();
    await expect(page.locator("#guestbook-thanks")).not.toBeVisible();
  });

  test("cannot submit with message field empty", async ({ page }) => {
    await page.fill("#gb-name", "สมชาย");
    await page.click('#guestbook-form button[type="submit"]');
    await expect(page.locator("#gb-err-msg")).toBeVisible();
    await expect(page.locator("#guestbook-thanks")).not.toBeVisible();
  });
});

test.describe("Guestbook — edge cases", () => {
  test("HTML special characters in message are escaped (XSS prevention)", async ({ page }) => {
    await mockGAS(page);
    await page.goto("/?goto=guestbook");
    await expect(page.locator("#guestbook-form")).toBeVisible({ timeout: 10_000 });

    const xssPayload = '<script>alert("xss")</script>';
    await page.fill("#gb-name", "ทดสอบ");
    await page.fill("#gb-message", xssPayload);
    await page.click('#guestbook-form button[type="submit"]');

    await expect(page.locator("#guestbook-thanks")).toBeVisible({ timeout: 8_000 });

    // The script tag should not execute — no alert dialog
    const feedHtml = await page.locator("#guestbook-feed").innerHTML();
    expect(feedHtml).not.toContain("<script>");
  });

  test("Thai characters and emoji in message render correctly", async ({ page }) => {
    await mockGAS(page, {
      guestbook: [{ name: "คุณแม่", message: "ลูกแม่น่ารักที่สุด ♡ 🌸", ts: "2026-01-01T00:00:00Z", visible: true }],
    });
    await page.goto("/?goto=guestbook");
    await expect(page.locator("#guestbook-feed")).toContainText("ลูกแม่น่ารักที่สุด", { timeout: 10_000 });
    await expect(page.locator("#guestbook-feed")).toContainText("♡");
  });

  test("submit button is disabled after first click", async ({ page }) => {
    await mockGAS(page);
    await page.goto("/?goto=guestbook");
    await expect(page.locator("#guestbook-form")).toBeVisible({ timeout: 10_000 });

    await page.fill("#gb-name", "ทดสอบ");
    await page.fill("#gb-message", "ยินดีด้วย");

    const submitBtn = page.locator('#guestbook-form button[type="submit"]');

    // Override with a slow POST handler (registered after mockGAS = higher priority)
    await page.route("**/script.google.com/**", async (route) => {
      if (route.request().method() === "POST") {
        await new Promise((r) => setTimeout(r, 500));
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
      } else {
        await route.fallback();
      }
    });

    await submitBtn.click();
    await expect(submitBtn).toBeDisabled();
  });
});
