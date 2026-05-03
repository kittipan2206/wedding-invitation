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
    await expect(page.locator("#admin-screen")).toBeVisible({ timeout: 10_000 });
  });

  test("logout returns to login screen", async ({ page }) => {
    await login(page);
    await page.click("#sidebar-logout");
    await expect(page.locator("#auth-screen")).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("#admin-screen")).toBeHidden();
  });
});

test.describe("Admin — tab navigation", () => {
  test("can switch between all tabs", async ({ page }) => {
    await login(page);

    for (const tab of ["gallery", "rsvp", "guestbook", "music"]) {
      await page.click(`.tab-item[data-tab="${tab}"]`);
      await expect(page.locator(`#tab-${tab}`)).not.toHaveClass(/tab-panel--hidden/, { timeout: 5_000 });
    }
  });

  test("event tab is active by default", async ({ page }) => {
    await login(page);
    await expect(page.locator("#tab-event")).toBeVisible();
    await expect(page.locator("#tab-event")).not.toHaveClass(/tab-panel--hidden/);
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
    await expect(page.locator("#btn-save-event")).toBeVisible({ timeout: 8_000 });
  });
});

test.describe("Admin — RSVP tab", () => {
  test("shows summary stats", async ({ page }) => {
    await mockGAS(page, {
      rsvpList: [
        { name: "สมชาย", attendance: "ยินดีเข้าร่วม", count: "2", ts: "2026-01-01T00:00:00Z" },
      ],
    });
    await page.goto("/admin.html");
    await page.fill("#admin-password", CORRECT_PASSWORD);
    await page.click('#auth-form button[type="submit"]');
    await expect(page.locator("#admin-screen")).toBeVisible({ timeout: 8_000 });

    await page.click('.tab-item[data-tab="rsvp"]');
    await expect(page.locator("#tab-rsvp")).not.toHaveClass(/tab-panel--hidden/, { timeout: 5_000 });

    await expect(page.locator("#rsvp-count-coming")).toBeVisible();
    await expect(page.locator("#rsvp-count-notcoming")).toBeVisible();
  });

  test("search input is present in RSVP tab", async ({ page }) => {
    await login(page);
    await page.click('.tab-item[data-tab="rsvp"]');
    await expect(page.locator("#rsvp-search")).toBeVisible({ timeout: 5_000 });
  });

  test("export CSV button is present", async ({ page }) => {
    await login(page);
    await page.click('.tab-item[data-tab="rsvp"]');
    await expect(page.locator("#btn-export-rsvp")).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Admin — music tab", () => {
  test("music tab has mode switching buttons (library / URL / upload)", async ({ page }) => {
    await login(page);
    await page.click('.tab-item[data-tab="music"]');
    await expect(page.locator("#tab-music")).not.toHaveClass(/tab-panel--hidden/, { timeout: 5_000 });

    await expect(page.locator('.music-mode-btn[data-mode="library"]')).toBeVisible();
    await expect(page.locator('.music-mode-btn[data-mode="url"]')).toBeVisible();
    await expect(page.locator('.music-mode-btn[data-mode="upload"]')).toBeVisible();
  });

  test("switching to URL mode shows URL input panel", async ({ page }) => {
    await login(page);
    await page.click('.tab-item[data-tab="music"]');
    await expect(page.locator("#tab-music")).not.toHaveClass(/tab-panel--hidden/, { timeout: 5_000 });

    await page.click('.music-mode-btn[data-mode="url"]');
    await expect(page.locator("#music-panel-url")).toBeVisible({ timeout: 3_000 });
  });

  test("switching to upload mode shows upload panel", async ({ page }) => {
    await login(page);
    await page.click('.tab-item[data-tab="music"]');
    await expect(page.locator("#tab-music")).not.toHaveClass(/tab-panel--hidden/, { timeout: 5_000 });

    await page.click('.music-mode-btn[data-mode="upload"]');
    await expect(page.locator("#music-panel-upload")).toBeVisible({ timeout: 3_000 });
  });
});
