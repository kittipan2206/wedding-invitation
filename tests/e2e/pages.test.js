import { test, expect } from "@playwright/test";
import { mockGAS } from "./helpers/mock-gas.js";

test.describe("Card page (/card.html)", () => {
  test("loads and shows couple names", async ({ page }) => {
    await mockGAS(page);
    await page.goto("/card.html");
    await expect(page.locator(".card-names")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(".card-names")).toContainText("นนท์");
    await expect(page.locator(".card-names")).toContainText("เมย์");
  });

  test("shows the date", async ({ page }) => {
    await mockGAS(page);
    await page.goto("/card.html");
    await expect(page.locator(".card-date")).toBeVisible({ timeout: 10_000 });
  });

  test("export/download button is present", async ({ page }) => {
    await mockGAS(page);
    await page.goto("/card.html");
    await expect(page.locator("#share-btn")).toBeVisible({ timeout: 10_000 });
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
        { url: "https://picsum.photos/seed/1/400/300", caption: "รูปที่ 1", category: "wedding", visible: true, order: 1 },
        { url: "https://picsum.photos/seed/2/400/300", caption: "รูปที่ 2", category: "pre-wedding", visible: true, order: 2 },
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
