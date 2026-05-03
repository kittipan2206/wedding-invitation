import { test, expect } from "@playwright/test";
import { mockGAS, DEFAULT_CONFIG } from "./helpers/mock-gas.js";

test.describe("Homepage — page load", () => {
  test("loads without console errors and shows couple names", async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await mockGAS(page);
    await page.goto("/");
    // Dismiss loader
    await expect(page.locator("#page-loader")).toBeHidden({ timeout: 15_000 });
    await expect(page.locator(".hero-names")).toBeVisible();
    await expect(page.locator(".hero-names")).toContainText("นนท์");
    await expect(page.locator(".hero-names")).toContainText("เมย์");

    expect(errors.filter((e) => !e.includes("favicon"))).toHaveLength(0);
  });

  test("shows couple names from server config", async ({ page }) => {
    await mockGAS(page, { config: { groom_name: "บอล", bride_name: "นิ่ม" } });
    await page.goto("/");
    await expect(page.locator("#page-loader")).toBeHidden({ timeout: 15_000 });
    await expect(page.locator(".hero-names")).toContainText("บอล");
    await expect(page.locator(".hero-names")).toContainText("นิ่ม");
  });

  test("still loads with default values when server is unreachable", async ({
    page,
  }) => {
    await page.route("**/script.google.com/**", (route) =>
      route.abort("failed"),
    );
    await page.goto("/");
    await expect(page.locator("#page-loader")).toBeHidden({ timeout: 15_000 });
    await expect(page.locator(".hero-names")).toBeVisible();
  });
});

test.describe("Homepage — URL parameters", () => {
  test("?to=NAME shows guest name in greeting", async ({ page }) => {
    await mockGAS(page);
    await page.goto("/?to=สมชาย");
    await expect(page.locator("#page-loader")).toBeHidden({ timeout: 15_000 });
    const greeting = page.locator(".guest-greeting");
    await expect(greeting).toBeVisible();
    await expect(greeting).toContainText("สมชาย");
  });

  test("?to= (empty) does not show guest greeting", async ({ page }) => {
    await mockGAS(page);
    await page.goto("/?to=");
    await expect(page.locator("#page-loader")).toBeHidden({ timeout: 15_000 });
    const greeting = page.locator(".guest-greeting");
    await expect(greeting).toBeHidden();
  });

  test("?goto=rsvp skips envelope and scrolls to RSVP", async ({ page }) => {
    await mockGAS(page);
    await page.goto("/?goto=rsvp");
    await expect(page.locator("#envelope-overlay")).toBeHidden({
      timeout: 10_000,
    });
    await expect(page.locator("#rsvp")).toBeInViewport({ timeout: 8_000 });
  });

  test("?goto=guestbook skips envelope and scrolls to guestbook", async ({
    page,
  }) => {
    await mockGAS(page);
    await page.goto("/?goto=guestbook");
    await expect(page.locator("#envelope-overlay")).toBeHidden({
      timeout: 10_000,
    });
    await expect(page.locator("#guestbook")).toBeInViewport({ timeout: 8_000 });
  });
});

test.describe("Homepage — envelope", () => {
  test("envelope is shown on first visit", async ({ page }) => {
    await mockGAS(page);
    await page.goto("/");
    await expect(page.locator("#page-loader")).toBeHidden({ timeout: 15_000 });
    await expect(page.locator("#envelope-overlay")).toBeVisible();
  });

  test("clicking the envelope opens it", async ({ page }) => {
    await mockGAS(page);
    await page.goto("/");
    await expect(page.locator("#page-loader")).toBeHidden({ timeout: 15_000 });
    await expect(page.locator("#envelope-overlay")).toBeVisible();
    await page.click(".envelope-body");
    await expect(page.locator("#envelope-overlay")).toBeHidden({
      timeout: 5_000,
    });
  });

  test("music and fullscreen buttons are visible on envelope screen", async ({
    page,
  }) => {
    await mockGAS(page);
    await page.goto("/");
    await expect(page.locator("#page-loader")).toBeHidden({ timeout: 15_000 });
    await expect(page.locator("#env-music-btn")).toBeVisible();
    await expect(page.locator("#env-fullscreen-btn")).toBeVisible();
  });
});

test.describe("Homepage — event details", () => {
  test("detail cards show date, time, venue, and dress code", async ({
    page,
  }) => {
    await mockGAS(page);
    await page.goto("/?goto=rsvp");
    await expect(page.locator("#page-loader")).toBeHidden({ timeout: 15_000 });

    await expect(page.locator("#dc-venue")).toContainText("สตูล");
    await expect(page.locator("#dc-dress")).toContainText("Pastel");
  });

  test("navigate button links to Google Maps", async ({ page }) => {
    await mockGAS(page);
    await page.goto("/?goto=rsvp");
    await expect(page.locator("#page-loader")).toBeHidden({ timeout: 15_000 });

    const href = await page.locator("#map-navigate-btn").getAttribute("href");
    expect(href).toMatch(/maps/);
  });

  test("add to calendar button links to Google Calendar", async ({ page }) => {
    await mockGAS(page);
    await page.goto("/?goto=rsvp");
    await expect(page.locator("#page-loader")).toBeHidden({ timeout: 15_000 });

    const href = await page.locator("#calendar-btn").getAttribute("href");
    expect(href).toContain("calendar.google.com");
  });
});

test.describe("Homepage — countdown", () => {
  test("shows countdown grid for a future event", async ({ page }) => {
    await mockGAS(page, { config: { event_date_iso: "2099-01-01" } });
    await page.goto("/?goto=rsvp");
    await expect(page.locator("#page-loader")).toBeHidden({ timeout: 15_000 });
    await expect(page.locator(".countdown-grid")).toBeVisible();
    await expect(page.locator("#countdown-ended")).toBeHidden();
  });

  test("shows ended message for a past event", async ({ page }) => {
    await mockGAS(page, {
      config: { event_date_iso: "2020-01-01", event_time_ceremony: "10:00" },
    });
    await page.goto("/?goto=rsvp");
    await expect(page.locator("#page-loader")).toBeHidden({ timeout: 15_000 });
    await expect(page.locator("#countdown-ended")).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.locator(".countdown-grid")).toBeHidden();
  });
});

test.describe("Homepage — mobile layout", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("page loads without horizontal scroll on mobile", async ({ page }) => {
    await mockGAS(page);
    await page.goto("/");
    await expect(page.locator("#page-loader")).toBeHidden({ timeout: 15_000 });

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 2); // 2px tolerance
  });
});

// ─── Gallery Preview (on main page) ──────────────────────────────────────────

const PREVIEW_PHOTOS = Array.from({ length: 8 }, (_, i) => ({
  url: `https://picsum.photos/seed/p${i}/400/300`,
  caption: `Preview ${i + 1}`,
  category: "wedding",
  visible: true,
  order: i + 1,
}));

test.describe("Homepage — gallery preview", () => {
  test("shows preview grid when photos exist", async ({ page }) => {
    await mockGAS(page, { photos: PREVIEW_PHOTOS });
    await page.goto("/?goto=guestbook");
    await expect(page.locator("#page-loader")).toBeHidden({ timeout: 15_000 });
    await expect(
      page.locator("#gallery-section, #gallery, .gallery-preview"),
    ).toBeVisible({ timeout: 8_000 });
  });

  test("shows at most 6 photos in the preview grid", async ({ page }) => {
    await mockGAS(page, { photos: PREVIEW_PHOTOS });
    await page.goto("/?goto=guestbook");
    await expect(page.locator("#page-loader")).toBeHidden({ timeout: 15_000 });
    // Wait for gallery items to render
    await page
      .waitForSelector(".gallery-item, #gallery-preview-grid .gallery-item", {
        timeout: 10_000,
      })
      .catch(() => {});
    const items = await page
      .locator(
        "#gallery-preview-grid .gallery-item, .gallery-preview .gallery-item",
      )
      .count();
    expect(items).toBeLessThanOrEqual(6);
  });

  test("'View All' button is visible when there are more than 6 photos", async ({
    page,
  }) => {
    await mockGAS(page, { photos: PREVIEW_PHOTOS }); // 8 photos
    await page.goto("/?goto=guestbook");
    await expect(page.locator("#page-loader")).toBeHidden({ timeout: 15_000 });
    await expect(
      page.locator("#gallery-view-all, [id*='view-all']"),
    ).toBeVisible({ timeout: 8_000 });
  });

  test("gallery section is hidden when no photos exist", async ({ page }) => {
    await mockGAS(page, { photos: [] });
    await page.goto("/?goto=guestbook");
    await expect(page.locator("#page-loader")).toBeHidden({ timeout: 15_000 });
    // Section should either be hidden or show empty state (not crash)
    const section = page.locator("#gallery-section, #gallery");
    const isHidden = await section.isHidden().catch(() => true);
    const hasItems = await page
      .locator("#gallery-preview-grid .gallery-item")
      .count();
    expect(isHidden || hasItems === 0).toBe(true);
  });

  test("clicking a preview photo opens the overlay lightbox", async ({
    page,
  }) => {
    await mockGAS(page, { photos: PREVIEW_PHOTOS });
    await page.goto("/?goto=guestbook");
    await expect(page.locator("#page-loader")).toBeHidden({ timeout: 15_000 });
    const item = page
      .locator(
        "#gallery-preview-grid .gallery-item, .gallery-preview .gallery-item",
      )
      .first();
    await item.waitFor({ state: "visible", timeout: 10_000 });
    await item.click();
    // The overlay lightbox opens when a preview photo is clicked
    await expect(page.locator("#overlay-lightbox")).toHaveClass(
      /lightbox--open/,
      { timeout: 5_000 },
    );
  });
});

test.describe("Homepage — envelope localStorage", () => {
  test("envelope already open when localStorage flag is set", async ({
    page,
  }) => {
    await mockGAS(page);
    // Set localStorage before loading
    await page.addInitScript(() => {
      localStorage.setItem("envelope_opened", "1");
    });
    await page.goto("/");
    await expect(page.locator("#page-loader")).toBeHidden({ timeout: 15_000 });
    await expect(page.locator("#envelope-overlay")).toBeHidden({
      timeout: 5_000,
    });
  });
});
