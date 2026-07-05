import { test, expect } from "@playwright/test";
import { mockGAS } from "./helpers/mock-gas.js";

// The form lives inside the composer overlay — open it via the board slot
async function openComposer(page) {
  const trigger = page.locator("#gb-composer-trigger");
  await expect(trigger).toBeVisible({ timeout: 10_000 });
  await trigger.click();
  await expect(page.locator("#guestbook-form")).toBeVisible({
    timeout: 5_000,
  });
}

test.describe("Guestbook — composer", () => {
  test("slot expands into the letter composer and closes again", async ({
    page,
  }) => {
    await mockGAS(page);
    await page.goto("/?goto=guestbook");
    await openComposer(page);
    // Letter paper with the couple letterhead
    await expect(page.locator("#gb-letter-to")).toContainText("ถึง");
    // Escape closes without sending
    await page.keyboard.press("Escape");
    await expect(page.locator("#guestbook-form")).toBeHidden();
    await expect(page.locator("#gb-composer-trigger")).toBeVisible();
  });
});

test.describe("Guestbook — happy path", () => {
  test("sending mails the letter onto the board and shows the thank-you", async ({
    page,
  }) => {
    await mockGAS(page);
    await page.goto("/?goto=guestbook");
    await openComposer(page);

    await page.fill("#gb-name", "สมชาย");
    await page.fill("#gb-message", "ขอให้รักกันยาวนาน!");
    await page.click('#guestbook-form button[type="submit"]');

    // The card flies onto the board (top of feed) and the composer closes
    await expect(
      page.locator("#guestbook-feed .gb-entry").first(),
    ).toContainText("ขอให้รักกันยาวนาน", { timeout: 8_000 });
    await expect(page.locator("#gb-composer")).toBeHidden({ timeout: 5_000 });
    await expect(page.locator("#guestbook-thanks")).toBeVisible({
      timeout: 8_000,
    });
    // The write slot is gone — one blessing per visit
    await expect(page.locator("#gb-composer-trigger")).toBeHidden();
  });

  test("existing messages from server are rendered in feed", async ({
    page,
  }) => {
    await mockGAS(page, {
      guestbook: [
        {
          name: "แขกคนแรก",
          message: "ขอให้มีความสุข",
          ts: "2026-01-01T00:00:00Z",
          visible: true,
        },
        {
          name: "แขกคนสอง",
          message: "สวย มากเลย",
          ts: "2026-01-02T00:00:00Z",
          visible: true,
        },
      ],
    });
    await page.goto("/?goto=guestbook");
    await expect(page.locator("#guestbook-feed")).toContainText("แขกคนแรก", {
      timeout: 10_000,
    });
    await expect(page.locator("#guestbook-feed")).toContainText("แขกคนสอง");
  });
});

test.describe("Guestbook — validation", () => {
  test.beforeEach(async ({ page }) => {
    await mockGAS(page);
    await page.goto("/?goto=guestbook");
    await openComposer(page);
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
  test("HTML special characters in message are escaped (XSS prevention)", async ({
    page,
  }) => {
    await mockGAS(page);
    await page.goto("/?goto=guestbook");
    await openComposer(page);

    const xssPayload = '<script>alert("xss")</script>';
    await page.fill("#gb-name", "ทดสอบ");
    await page.fill("#gb-message", xssPayload);
    await page.click('#guestbook-form button[type="submit"]');

    await expect(page.locator("#guestbook-thanks")).toBeVisible({
      timeout: 8_000,
    });

    // The script tag should not execute — no alert dialog
    const feedHtml = await page.locator("#guestbook-feed").innerHTML();
    expect(feedHtml).not.toContain("<script>");
  });

  test("Thai characters and emoji in message render correctly", async ({
    page,
  }) => {
    await mockGAS(page, {
      guestbook: [
        {
          name: "คุณแม่",
          message: "ลูกแม่น่ารักที่สุด ♡ 🌸",
          ts: "2026-01-01T00:00:00Z",
          visible: true,
        },
      ],
    });
    await page.goto("/?goto=guestbook");
    await expect(page.locator("#guestbook-feed")).toContainText(
      "ลูกแม่น่ารักที่สุด",
      { timeout: 10_000 },
    );
    await expect(page.locator("#guestbook-feed")).toContainText("♡");
  });

  test("submit button is disabled after first click", async ({ page }) => {
    await mockGAS(page);
    await page.goto("/?goto=guestbook");
    await openComposer(page);

    await page.fill("#gb-name", "ทดสอบ");
    await page.fill("#gb-message", "ยินดีด้วย");

    const submitBtn = page.locator('#guestbook-form button[type="submit"]');

    // Override with a slow POST handler (registered after mockGAS = higher priority)
    await page.route("**/script.google.com/**", async (route) => {
      if (route.request().method() === "POST") {
        await new Promise((r) => setTimeout(r, 500));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      } else {
        await route.fallback();
      }
    });

    await submitBtn.click();
    await expect(submitBtn).toBeDisabled();
  });
});
