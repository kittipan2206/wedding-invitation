import { describe, it, expect } from "vitest";
import {
  isIOS,
  isApple,
  isLineApp,
  isInAppBrowser,
} from "../../src/js/platform.js";

const UA = {
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  iphoneLine:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Line/14.05.0",
  iphoneFacebook:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0;FBBV/123456]",
  macSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  androidChrome:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
  androidLine:
    "Mozilla/5.0 (Linux; Android 14; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36 Line/14.05.0/IAB",
  windowsChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
};

describe("isIOS", () => {
  it("detects iPhone Safari", () => {
    expect(isIOS(UA.iphoneSafari, 5)).toBe(true);
  });

  it("detects iPadOS 13+ that reports itself as a Mac (touch screen)", () => {
    expect(isIOS(UA.macSafari, 5)).toBe(true);
  });

  it("does not flag a real Mac (no touch)", () => {
    expect(isIOS(UA.macSafari, 0)).toBe(false);
  });

  it("does not flag Android or Windows", () => {
    expect(isIOS(UA.androidChrome, 5)).toBe(false);
    expect(isIOS(UA.windowsChrome, 0)).toBe(false);
  });
});

describe("isApple", () => {
  it("covers iPhone, iPad-as-Mac, and real Macs", () => {
    expect(isApple(UA.iphoneSafari, 5)).toBe(true);
    expect(isApple(UA.macSafari, 5)).toBe(true);
    expect(isApple(UA.macSafari, 0)).toBe(true);
  });

  it("excludes Android and Windows", () => {
    expect(isApple(UA.androidChrome, 5)).toBe(false);
    expect(isApple(UA.windowsChrome, 0)).toBe(false);
  });
});

describe("isLineApp", () => {
  it("detects LINE in-app browser on both platforms", () => {
    expect(isLineApp(UA.iphoneLine)).toBe(true);
    expect(isLineApp(UA.androidLine)).toBe(true);
  });

  it("does not flag regular browsers", () => {
    expect(isLineApp(UA.iphoneSafari)).toBe(false);
    expect(isLineApp(UA.androidChrome)).toBe(false);
  });

  it('does not false-positive on words merely containing "line"', () => {
    expect(isLineApp("Mozilla/5.0 Outline/2.0 Safari/605.1.15")).toBe(false);
  });
});

describe("isInAppBrowser", () => {
  it("detects LINE and Facebook webviews", () => {
    expect(isInAppBrowser(UA.iphoneLine)).toBe(true);
    expect(isInAppBrowser(UA.androidLine)).toBe(true);
    expect(isInAppBrowser(UA.iphoneFacebook)).toBe(true);
  });

  it("does not flag regular browsers", () => {
    expect(isInAppBrowser(UA.iphoneSafari)).toBe(false);
    expect(isInAppBrowser(UA.windowsChrome)).toBe(false);
  });
});
