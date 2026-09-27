import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Line/14.0.0";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36";

async function load(ua, { ask = true } = {}) {
  vi.resetModules();
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(ua);
  window.DeviceOrientationEvent = function () {};
  if (ask) window.DeviceOrientationEvent.requestPermission = vi.fn(async () => "granted");
  return import("../../src/js/tilt.js");
}

describe("phone tilt", () => {
  afterEach(() => vi.restoreAllMocks());

  it("reads the first grip as level, then ±22° as ±1", async () => {
    const t = await load(ANDROID);
    const got = [];
    t.onTilt((x, y) => got.push([x, y]));
    t.feed(40, 0); // held at 40° — that's "flat"
    t.feed(40, 22);
    expect(got[0]).toEqual([0, 0]);
    expect(got[1][0]).toBeGreaterThan(0.95);
  });

  it("drifts back to level when the phone is held still at a new angle", async () => {
    const t = await load(ANDROID);
    let x = 0;
    t.onTilt((nx) => (x = nx));
    t.feed(40, 0);
    for (let i = 0; i < 180; i++) t.feed(40, 15); // ~3 s at 60 readings/s
    expect(Math.abs(x)).toBeLessThan(0.1);
  });

  it("shows the opt-in pill on iPhone only", async () => {
    expect((await load(IPHONE)).needsMotionPrompt()).toBe(true);
    // Brave/Chrome on Android expose the call but grant it silently
    expect((await load(ANDROID)).needsMotionPrompt()).toBe(false);
    expect((await load(IPHONE, { ask: false })).needsMotionPrompt()).toBe(false);
  });

  it("asks silently on Android's first touch, never on iPhone", async () => {
    const a = await load(ANDROID);
    a.primeMotion();
    window.dispatchEvent(new Event("pointerdown"));
    expect(window.DeviceOrientationEvent.requestPermission).toHaveBeenCalledTimes(1);

    const i = await load(IPHONE);
    i.primeMotion();
    window.dispatchEvent(new Event("pointerdown"));
    expect(window.DeviceOrientationEvent.requestPermission).not.toHaveBeenCalled();
  });

  it("requestMotion reports a denial", async () => {
    const t = await load(IPHONE);
    window.DeviceOrientationEvent.requestPermission = vi.fn(async () => "denied");
    expect(await t.requestMotion()).toBe(false);
  });
});
