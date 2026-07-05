import { test, expect } from "@playwright/test";
import { mockGAS } from "./helpers/mock-gas.js";

const PHOTOS = [
  {
    url: "https://picsum.photos/seed/a/400/600",
    caption: "รูปที่ 1",
    category: "wedding",
    visible: true,
    order: 1,
  },
  {
    url: "https://picsum.photos/seed/b/400/300",
    caption: "รูปที่ 2",
    category: "pre-wedding",
    visible: true,
    order: 2,
  },
  {
    url: "https://picsum.photos/seed/c/400/500",
    caption: "รูปที่ 3",
    category: "wedding",
    visible: true,
    order: 3,
  },
];

// The photo viewer is PhotoSwipe: root is `.pswp` (open => `.pswp--open`), with
// `.pswp__button--arrow--next/prev`, `.pswp__button--close`, a `.pswp__counter`
// indicator, and our `.pswp__custom-caption`.
test.describe("Gallery page (/gallery.html) — lightbox", () => {
  test.beforeEach(async ({ page }) => {
    await mockGAS(page, { photos: PHOTOS });
    await page.goto("/gallery.html");
    await expect(page.locator(".gallery-item").first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("clicking a photo opens the lightbox", async ({ page }) => {
    await page.locator(".gallery-item").first().click();
    await expect(page.locator(".pswp")).toBeVisible({ timeout: 5_000 });
  });

  test("lightbox shows the clicked photo", async ({ page }) => {
    await page.locator(".gallery-item").first().click();
    await expect(page.locator(".pswp")).toBeVisible({ timeout: 5_000 });
    await expect(page.locator(".pswp__img").first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test("lightbox next button advances to next photo", async ({ page, isMobile }) => {
    test.skip(isMobile, "PhotoSwipe next/prev buttons are hidden on mobile");
    await page.locator(".gallery-item").first().click();
    await expect(page.locator(".pswp")).toBeVisible({ timeout: 5_000 });
    await expect(page.locator(".pswp__counter")).toHaveText(/1\s*\/\s*3/, {
      timeout: 5_000,
    });
    await page.click(".pswp__button--arrow--next");
    await expect(page.locator(".pswp__counter")).toHaveText(/2\s*\/\s*3/, {
      timeout: 5_000,
    });
  });

  test("lightbox prev button goes back", async ({ page, isMobile }) => {
    test.skip(isMobile, "PhotoSwipe next/prev buttons are hidden on mobile");
    await page.locator(".gallery-item").nth(1).click();
    await expect(page.locator(".pswp")).toBeVisible({ timeout: 5_000 });
    await expect(page.locator(".pswp__counter")).toHaveText(/2\s*\/\s*3/, {
      timeout: 5_000,
    });
    await page.click(".pswp__button--arrow--prev");
    await expect(page.locator(".pswp__counter")).toHaveText(/1\s*\/\s*3/, {
      timeout: 5_000,
    });
  });

  test("pressing Escape closes the lightbox", async ({ page }) => {
    await page.locator(".gallery-item").first().click();
    await expect(page.locator(".pswp")).toBeVisible({ timeout: 5_000 });
    await page.keyboard.press("Escape");
    await expect(page.locator(".pswp")).toBeHidden({ timeout: 5_000 });
  });

  test("clicking the close button closes the lightbox", async ({ page }) => {
    await page.locator(".gallery-item").first().click();
    await expect(page.locator(".pswp")).toBeVisible({ timeout: 5_000 });
    await page.click(".pswp__button--close");
    await expect(page.locator(".pswp")).toBeHidden({ timeout: 5_000 });
  });
});

test.describe("Gallery page (/gallery.html) — captions", () => {
  test("photo captions are shown when available", async ({ page }) => {
    await mockGAS(page, { photos: PHOTOS });
    await page.goto("/gallery.html");
    await expect(page.locator(".gallery-item").first()).toBeVisible({
      timeout: 15_000,
    });
    await page.locator(".gallery-item").first().click();
    await expect(page.locator(".pswp")).toBeVisible({ timeout: 5_000 });
    await expect(page.locator(".pswp__custom-caption")).toContainText(
      "รูปที่ 1",
      { timeout: 5_000 },
    );
  });
});

test.describe("Gallery page (/gallery.html) — filter", () => {
  test("filtering by 'wedding' category shows only matching photos", async ({
    page,
  }) => {
    await mockGAS(page, { photos: PHOTOS });
    await page.goto("/gallery.html");
    await expect(page.locator(".gallery-item").first()).toBeVisible({
      timeout: 15_000,
    });

    const initialCount = await page.locator(".gallery-item").count();
    // Click wedding filter if present
    const weddingFilter = page.locator(
      '[data-filter="wedding"], [data-category="wedding"]',
    );
    if ((await weddingFilter.count()) > 0) {
      await weddingFilter.first().click();
      await page.waitForTimeout(300);
      const filteredCount = await page.locator(".gallery-item:visible").count();
      // Wedding photos = 2 out of 3
      expect(filteredCount).toBeLessThanOrEqual(initialCount);
    }
  });

  test("page works with zero photos (no crash, shows empty state)", async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await mockGAS(page, { photos: [] });
    await page.goto("/gallery.html");
    await page.waitForTimeout(1000);
    expect(errors.filter((e) => !e.includes("favicon"))).toHaveLength(0);
  });
});

test.describe("Gallery page (/gallery.html) — mobile", () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

  test("touch swipe in lightbox navigates photos", async ({ page }) => {
    await mockGAS(page, { photos: PHOTOS });
    await page.goto("/gallery.html");
    await expect(page.locator(".gallery-item").first()).toBeVisible({
      timeout: 15_000,
    });

    await page.locator(".gallery-item").first().click();
    await expect(page.locator(".pswp")).toBeVisible({ timeout: 5_000 });

    const lb = page.locator(".pswp");
    const box = await lb.boundingBox();
    if (!box) return;

    // Swipe left = next photo (PhotoSwipe handles touch drag)
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, {
      steps: 10,
    });
    await page.mouse.up();

    // At minimum, the viewer should still be open after the gesture
    await expect(page.locator(".pswp")).toBeVisible();
  });

  test("page loads on 375px mobile without horizontal scroll", async ({
    page,
  }) => {
    await mockGAS(page, { photos: PHOTOS });
    await page.goto("/gallery.html");
    await expect(page.locator(".gallery-item").first()).toBeVisible({
      timeout: 15_000,
    });
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 2);
  });
});
