import { describe, it, expect } from "vitest";
import { getCountdownPhase, headingCopy } from "../../src/js/countdown.js";
import { pickHeroPhoto } from "../../src/js/hero-photo.js";

describe("getCountdownPhase", () => {
  const iso = "2026-08-01";

  it("counts down before the wedding day", () => {
    expect(getCountdownPhase(iso, new Date("2026-07-31T23:00:00+07:00"))).toBe(
      "counting",
    );
  });

  it("is day-of from midnight Bangkok on the wedding day", () => {
    expect(getCountdownPhase(iso, new Date("2026-08-01T00:01:00+07:00"))).toBe(
      "day-of",
    );
    expect(getCountdownPhase(iso, new Date("2026-08-01T18:00:00+07:00"))).toBe(
      "day-of",
    );
  });

  it("ends after the wedding day", () => {
    expect(getCountdownPhase(iso, new Date("2026-08-02T00:01:00+07:00"))).toBe(
      "ended",
    );
  });
});

describe("headingCopy", () => {
  it("speaks in days when at least one day remains", () => {
    expect(headingCopy(49)).toBe("อีก 49 วัน เราจะได้เจอกัน");
    expect(headingCopy(1)).toBe("อีก 1 วัน เราจะได้เจอกัน");
  });

  it("switches to hours-excitement under one day", () => {
    expect(headingCopy(0)).toBe("อีกไม่กี่ชั่วโมงแล้ว!");
  });
});

describe("pickHeroPhoto", () => {
  const photos = [
    { url: "https://x/wedding1", category: "wedding", visible: true },
    { url: "https://x/pre1", category: "pre-wedding", visible: true },
    { url: "https://x/pre2", category: "pre-wedding", visible: true },
  ];

  it("prefers config hero_photo_url over everything", () => {
    expect(pickHeroPhoto({ hero_photo_url: "https://x/chosen" }, photos)).toBe(
      "https://x/chosen",
    );
  });

  it("falls back to the first visible pre-wedding photo", () => {
    expect(pickHeroPhoto({}, photos)).toBe("https://x/pre1");
  });

  it("falls back to the first visible photo when no pre-wedding exists", () => {
    expect(
      pickHeroPhoto({}, [{ url: "https://x/a", category: "wedding" }]),
    ).toBe("https://x/a");
  });

  it("skips hidden photos", () => {
    expect(
      pickHeroPhoto({}, [
        { url: "https://x/hidden", category: "pre-wedding", visible: false },
        { url: "https://x/shown", category: "pre-wedding", visible: true },
      ]),
    ).toBe("https://x/shown");
  });

  it("returns null with no photos and no config url", () => {
    expect(pickHeroPhoto({}, [])).toBe(null);
    expect(pickHeroPhoto({}, undefined)).toBe(null);
  });
});
