import { test, expect } from "@playwright/test";
import { mockGAS } from "./helpers/mock-gas.js";

const CORRECT_PASSWORD = "30122001";

async function login(page) {
  await mockGAS(page);
  await page.goto("/admin.html");
  await expect(page.locator("#auth-screen")).toBeVisible({ timeout: 10_000 });
  await page.fill("#admin-password", CORRECT_PASSWORD);
  await page.click('#auth-form button[type="submit"]');
  await expect(page.locator("#admin-screen")).toBeVisible({ timeout: 8_000 });
}

test.describe("Admin — authentication", () => {
  test("wrong password shows error message", async ({ page }) => {
    await mockGAS(page);
    await page.goto("/admin.html");
    await expect(page.locator("#auth-screen")).toBeVisible({ timeout: 10_000 });

    await page.fill("#admin-password", "wrongpassword");
    await page.click('#auth-form button[type="submit"]');

    await expect(page.locator("#auth-error")).toBeVisible();
    await expect(page.locator("#admin-screen")).toBeHidden();
  });

  test("correct password shows admin panel", async ({ page }) => {
    await login(page);
    await expect(page.locator("#admin-screen")).toBeVisible();
  });

  test("session persists on page reload", async ({ page }) => {
    await login(page);
    await page.reload();
    // Re-mock after reload
    await mockGAS(page);
    await page.goto("/admin.html");
    // sessionStorage persists across goto in same context
    await expect(page.locator("#admin-screen")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("logout returns to login screen", async ({ page }) => {
    await login(page);
    await page.dispatchEvent("#sidebar-logout", "click");
    await expect(page.locator("#auth-screen")).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("#admin-screen")).toBeHidden();
  });
});

test.describe("Admin — tab navigation", () => {
  test("can switch between all tabs", async ({ page }) => {
    await login(page);

    for (const tab of ["gallery", "rsvp", "guestbook", "music"]) {
      await page.dispatchEvent(`.tab-item[data-tab="${tab}"]`, "click");
      await expect(page.locator(`#tab-${tab}`)).not.toHaveClass(
        /tab-panel--hidden/,
        { timeout: 5_000 },
      );
    }
  });

  test("event tab is active by default", async ({ page }) => {
    await login(page);
    await expect(page.locator("#tab-event")).toBeVisible();
    await expect(page.locator("#tab-event")).not.toHaveClass(
      /tab-panel--hidden/,
    );
  });
});

test.describe("Admin — event info tab", () => {
  test("event fields are visible and editable", async ({ page }) => {
    await login(page);
    await expect(page.locator("#ev-groom")).toBeVisible({ timeout: 8_000 });
    await expect(page.locator("#ev-bride")).toBeVisible();
  });

  test("save button is present", async ({ page }) => {
    await login(page);
    await expect(page.locator("#btn-save-event")).toBeVisible({
      timeout: 8_000,
    });
  });
});

test.describe("Admin — RSVP tab", () => {
  test("shows summary stats", async ({ page }) => {
    await mockGAS(page, {
      rsvpList: [
        {
          name: "สมชาย",
          attendance: "ยินดีเข้าร่วม",
          count: "2",
          ts: "2026-01-01T00:00:00Z",
        },
      ],
    });
    await page.goto("/admin.html");
    await page.fill("#admin-password", CORRECT_PASSWORD);
    await page.click('#auth-form button[type="submit"]');
    await expect(page.locator("#admin-screen")).toBeVisible({ timeout: 8_000 });

    await page.dispatchEvent('.tab-item[data-tab="rsvp"]', "click");
    await expect(page.locator("#tab-rsvp")).not.toHaveClass(
      /tab-panel--hidden/,
      { timeout: 5_000 },
    );

    await expect(page.locator("#rsvp-count-coming")).toBeVisible();
    await expect(page.locator("#rsvp-count-notcoming")).toBeVisible();
  });

  test("search input is present in RSVP tab", async ({ page }) => {
    await login(page);
    await page.dispatchEvent('.tab-item[data-tab="rsvp"]', "click");
    await expect(page.locator("#rsvp-search")).toBeVisible({ timeout: 5_000 });
  });

  test("export CSV button is present", async ({ page }) => {
    await login(page);
    await page.dispatchEvent('.tab-item[data-tab="rsvp"]', "click");
    await expect(page.locator("#btn-export-rsvp")).toBeVisible({
      timeout: 5_000,
    });
  });
});

test.describe("Admin — music tab", () => {
  test("music tab has mode switching buttons (library / URL / upload)", async ({
    page,
  }) => {
    await login(page);
    await page.dispatchEvent('.tab-item[data-tab="music"]', "click");
    await expect(page.locator("#tab-music")).not.toHaveClass(
      /tab-panel--hidden/,
      { timeout: 5_000 },
    );

    await expect(
      page.locator('.music-mode-btn[data-mode="library"]'),
    ).toBeVisible();
    await expect(
      page.locator('.music-mode-btn[data-mode="url"]'),
    ).toBeVisible();
    await expect(
      page.locator('.music-mode-btn[data-mode="upload"]'),
    ).toBeVisible();
  });

  test("switching to URL mode shows URL input panel", async ({ page }) => {
    await login(page);
    await page.dispatchEvent('.tab-item[data-tab="music"]', "click");
    await expect(page.locator("#tab-music")).not.toHaveClass(
      /tab-panel--hidden/,
      { timeout: 5_000 },
    );

    await page.click('.music-mode-btn[data-mode="url"]');
    await expect(page.locator("#music-panel-url")).toBeVisible({
      timeout: 3_000,
    });
  });

  test("switching to upload mode shows upload panel", async ({ page }) => {
    await login(page);
    await page.dispatchEvent('.tab-item[data-tab="music"]', "click");
    await expect(page.locator("#tab-music")).not.toHaveClass(
      /tab-panel--hidden/,
      { timeout: 5_000 },
    );

    await page.click('.music-mode-btn[data-mode="upload"]');
    await expect(page.locator("#music-panel-upload")).toBeVisible({
      timeout: 3_000,
    });
  });
});

// ─── Admin Gallery Tab ────────────────────────────────────────────────────────

const GALLERY_PHOTOS = [
  {
    id: "photo-1",
    url: "https://picsum.photos/seed/g1/400/300",
    caption: "รูปแรก",
    category: "wedding",
    visible: true,
    order: 1,
  },
  {
    id: "photo-2",
    url: "https://picsum.photos/seed/g2/400/300",
    caption: "รูปที่สอง",
    category: "pre-wedding",
    visible: false,
    order: 2,
  },
];

test.describe("Admin — gallery tab", () => {
  test.beforeEach(async ({ page }) => {
    // login() registers its own mockGAS first; we then register a more specific
    // mock AFTER so Playwright (LIFO) runs it first for gallery photo requests.
    await login(page);
    await mockGAS(page, { photos: GALLERY_PHOTOS });
    await page.dispatchEvent('.tab-item[data-tab="gallery"]', "click");
    await expect(page.locator("#tab-gallery")).not.toHaveClass(
      /tab-panel--hidden/,
      { timeout: 5_000 },
    );
  });

  test("existing photos are listed with thumbnails and captions", async ({
    page,
  }) => {
    await expect(page.locator("#photo-list .photo-item")).toHaveCount(2, {
      timeout: 8_000,
    });
    await expect(page.locator(".photo-caption-input").first()).toHaveValue(
      "รูปแรก",
    );
    await expect(page.locator(".photo-caption-input").last()).toHaveValue(
      "รูปที่สอง",
    );
  });

  test("hidden photo has hidden indicator", async ({ page }) => {
    await expect(page.locator("#photo-list .photo-item--hidden")).toHaveCount(
      1,
      { timeout: 8_000 },
    );
  });

  test("add photo form is present", async ({ page }) => {
    await expect(page.locator("#add-photo-form")).toBeVisible({
      timeout: 5_000,
    });
  });

  test("adding a photo by URL appears in the list", async ({ page }) => {
    await expect(page.locator("#photo-list .photo-item")).toHaveCount(2, {
      timeout: 8_000,
    });
    const newUrl = "https://picsum.photos/seed/new/400/300";
    await page.fill("#new-url", newUrl);
    await page.fill("#new-caption", "รูปใหม่");
    await page.click('#add-photo-form button[type="submit"]');
    await expect(page.locator("#photo-list .photo-item")).toHaveCount(3, {
      timeout: 5_000,
    });
  });

  test("caption input is editable inline", async ({ page }) => {
    await expect(page.locator(".photo-caption-input").first()).toBeVisible({
      timeout: 8_000,
    });
    await page.locator(".photo-caption-input").first().fill("แก้ไขแล้ว");
    await expect(page.locator(".photo-caption-input").first()).toHaveValue(
      "แก้ไขแล้ว",
    );
  });

  test("toggle visibility button is present per photo", async ({ page }) => {
    await expect(page.locator(".btn-icon--vis").first()).toBeVisible({
      timeout: 8_000,
    });
  });

  test("clicking toggle visibility updates the photo item class", async ({
    page,
  }) => {
    await expect(page.locator("#photo-list .photo-item")).toHaveCount(2, {
      timeout: 8_000,
    });
    // First photo is visible — clicking hide toggles it to hidden
    await page.locator(".btn-icon--vis").first().click();
    await expect(page.locator("#photo-list .photo-item--hidden")).toHaveCount(
      2,
      { timeout: 3_000 },
    );
  });

  test("reorder up/down buttons are present", async ({ page }) => {
    await expect(page.locator(".btn-icon--up").first()).toBeVisible({
      timeout: 8_000,
    });
    await expect(page.locator(".btn-icon--down").first()).toBeVisible({
      timeout: 8_000,
    });
  });

  test("up button is disabled for the first photo", async ({ page }) => {
    await expect(page.locator("#photo-list .photo-item")).toHaveCount(2, {
      timeout: 8_000,
    });
    await expect(page.locator(".btn-icon--up").first()).toBeDisabled();
  });

  test("down button is disabled for the last photo", async ({ page }) => {
    await expect(page.locator("#photo-list .photo-item")).toHaveCount(2, {
      timeout: 8_000,
    });
    await expect(page.locator(".btn-icon--down").last()).toBeDisabled();
  });

  test("refresh button reloads the photo list", async ({ page }) => {
    await expect(page.locator("#refresh-btn")).toBeVisible({ timeout: 5_000 });
    await page.click("#refresh-btn");
    // After refresh, list should still show photos
    await expect(page.locator("#photo-list .photo-item")).toHaveCount(2, {
      timeout: 8_000,
    });
  });

  test("empty state shown when no photos exist", async ({ page }) => {
    // Override mock to return empty photos and reload tab
    await mockGAS(page, { photos: [] });
    // Navigate away then back to reload
    await page.dispatchEvent('.tab-item[data-tab="event"]', "click");
    await page.evaluate(() => {
      /* reset tabLoaded via reload workaround */
    });
    await page.goto("/admin.html");
    await page.evaluate(() =>
      sessionStorage.setItem("gallery_admin_auth", "1"),
    );
    await mockGAS(page, { photos: [] });
    await page.reload();
    await mockGAS(page, { photos: [] });
    await page.goto("/admin.html");
    await page.evaluate(() =>
      sessionStorage.setItem("gallery_admin_auth", "1"),
    );
    await page.goto("/admin.html");
    await mockGAS(page, { photos: [] });
    await expect(page.locator("#admin-screen")).toBeVisible({ timeout: 8_000 });
    await page.dispatchEvent('.tab-item[data-tab="gallery"]', "click");
    await expect(page.locator("#tab-gallery")).not.toHaveClass(
      /tab-panel--hidden/,
      { timeout: 5_000 },
    );
    // Empty state text should appear
    await expect(page.locator("#photo-list")).toContainText(
      /ไม่มีรูปภาพ|เพิ่มรูปแรก/,
      { timeout: 8_000 },
    );
  });
});
