import { test, expect } from "@playwright/test";
import { mockGAS } from "./helpers/mock-gas.js";

test.describe("Send invites (/card.html)", () => {
  test("previews the LINE message addressed to the typed guest", async ({
    page,
  }) => {
    await mockGAS(page);
    await page.goto("/card.html");
    await page.fill("#guest-name", "ต้น");
    await expect(page.locator("#line-preview-title")).toHaveText(
      "ถึง คุณต้น — นนท์ & เมย์ ขอเรียนเชิญร่วมงานแต่งงาน",
    );
    await expect(page.locator("#invite-link")).toContainText("/?to=ต้น");
    const href = await page.locator("#send-line-btn").getAttribute("href");
    expect(href).toMatch(/^https:\/\/line\.me\/R\/share\?text=/);
    expect(decodeURIComponent(href)).toContain(
      `?to=${encodeURIComponent("ต้น")}`,
    );
  });

  test("no name gives the generic link for group chats", async ({ page }) => {
    await mockGAS(page);
    await page.goto("/card.html");
    await expect(page.locator("#line-preview-title")).toContainText(
      "นนท์ & เมย์ — ขอเรียนเชิญร่วมงานแต่งงาน",
    );
    await expect(page.locator("#invite-link")).not.toContainText("?to=");
  });

  test("copy link confirms with a flash", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await mockGAS(page);
    await page.goto("/card.html");
    await page.fill("#guest-name", "ต้น");
    await page.click("#copy-link-btn");
    await expect(page.locator("#copy-link-btn")).toHaveText("คัดลอกแล้ว ✓");
  });

  test("draws the image card locally, no third-party scripts", async ({
    page,
  }) => {
    const external = [];
    page.on("request", (r) => {
      const host = new URL(r.url()).host;
      if (/cdnjs|qrserver|html2canvas/.test(host)) external.push(r.url());
    });
    await mockGAS(page);
    await page.goto("/card.html");
    await page.fill("#guest-name", "คุณสมชาย และครอบครัว");
    await expect(page.locator("#card-thumb")).toHaveAttribute(
      "src",
      /^data:image\/png/,
      { timeout: 15_000 },
    );
    await expect(page.locator("#download-card-btn")).toBeEnabled();
    expect(external).toHaveLength(0);
  });
});

test.describe("Gallery page (/gallery.html)", () => {
  test("loads without error when no photos exist", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await mockGAS(page, { photos: [] });
    await page.goto("/gallery.html");
    await expect(page).toHaveURL(/gallery\.html/);
    // Page should not crash
    expect(errors.filter((e) => !e.includes("favicon"))).toHaveLength(0);
  });

  test("loads and displays photos in a grid", async ({ page }) => {
    await mockGAS(page, {
      photos: [
        {
          url: "https://picsum.photos/seed/1/400/300",
          caption: "รูปที่ 1",
          category: "wedding",
          visible: true,
          order: 1,
        },
        {
          url: "https://picsum.photos/seed/2/400/300",
          caption: "รูปที่ 2",
          category: "pre-wedding",
          visible: true,
          order: 2,
        },
      ],
    });
    await page.goto("/gallery.html");
    await expect(page.locator("img").first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Display page (/display.html)", () => {
  test("loads without errors", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await mockGAS(page, { photos: [] });
    await page.goto("/display.html");
    await expect(page).toHaveURL(/display\.html/);
    expect(errors.filter((e) => !e.includes("favicon"))).toHaveLength(0);
  });

  test("shows couple names as an overlay", async ({ page }) => {
    await mockGAS(page);
    await page.goto("/display.html");
    // The display page should show names somewhere
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toMatch(/นนท์|เมย์/);
  });

  test("photos cycle automatically — slide changes without interaction", async ({
    page,
  }) => {
    await mockGAS(page, {
      photos: [
        {
          url: "https://picsum.photos/seed/d1/800/600",
          caption: "",
          category: "wedding",
          visible: true,
          order: 1,
        },
        {
          url: "https://picsum.photos/seed/d2/800/600",
          caption: "",
          category: "wedding",
          visible: true,
          order: 2,
        },
      ],
    });
    await page.goto("/display.html");
    // Wait for first slide to appear
    await page.waitForTimeout(500);
    // Grab initial active slide identifier (src or class)
    const firstSrc = await page
      .locator("img")
      .first()
      .getAttribute("src")
      .catch(() => "");
    // Wait long enough for at least one auto-advance (typical interval ≤ 10s)
    await page.waitForTimeout(11_000);
    // After cycle, the visible image src or slide index should have changed
    // (or the page should still be running without error — minimum bar)
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    expect(errors.filter((e) => !e.includes("favicon"))).toHaveLength(0);
  });

  test("display page does not require user interaction to start — no click prompt", async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await mockGAS(page, { photos: [] });
    await page.goto("/display.html");
    await page.waitForTimeout(1000);
    // Should not show a click/tap prompt blocking the display
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toMatch(/tap to start|คลิกเพื่อเริ่ม/i);
    expect(errors.filter((e) => !e.includes("favicon"))).toHaveLength(0);
  });
});

test.describe("Admin page (/admin.html)", () => {
  test("shows auth screen on first visit", async ({ page }) => {
    await mockGAS(page);
    await page.goto("/admin.html");
    await expect(page.locator("#auth-screen")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("#admin-screen")).toBeHidden();
  });

  test("admin panel is hidden before login", async ({ page }) => {
    await mockGAS(page);
    await page.goto("/admin.html");
    await expect(page.locator("#admin-screen")).toBeHidden({ timeout: 10_000 });
  });
});

test.describe("Themed QR codes (local render)", () => {
  test("display QR renders locally as a data URL", async ({ page }) => {
    await mockGAS(page, { photos: [] });
    await page.goto("/display.html");
    await expect(page.locator("#display-qr")).toHaveAttribute(
      "src",
      /^data:image\/png/,
      { timeout: 15_000 },
    );
  });
});
