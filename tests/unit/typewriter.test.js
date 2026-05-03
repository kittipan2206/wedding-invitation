import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { initTypewriter } from "../../src/js/typewriter.js";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("initTypewriter — basic output", () => {
  it("types out all characters from data-typewriter attribute", async () => {
    document.body.innerHTML = `<span class="hero-date" data-typewriter="ABC"></span>`;
    initTypewriter(".hero-date", { startDelay: 0, charDelay: 50 });

    await vi.advanceTimersByTimeAsync(200);
    expect(document.querySelector(".hero-date").textContent).toBe("ABC");
  });

  it("types out Thai characters correctly (Unicode-safe)", async () => {
    document.body.innerHTML = `<span class="hero-date" data-typewriter="สวัสดี"></span>`;
    initTypewriter(".hero-date", { startDelay: 0, charDelay: 50 });

    await vi.advanceTimersByTimeAsync(400);
    expect(document.querySelector(".hero-date").textContent).toBe("สวัสดี");
  });

  it("starts with an empty element before typing begins", async () => {
    document.body.innerHTML = `<span class="hero-date" data-typewriter="Hello"></span>`;
    initTypewriter(".hero-date", { startDelay: 100, charDelay: 50 });

    // Before startDelay fires
    await vi.advanceTimersByTimeAsync(50);
    expect(document.querySelector(".hero-date").textContent).toBe("");
  });

  it("types characters one at a time", async () => {
    document.body.innerHTML = `<span class="hero-date" data-typewriter="AB"></span>`;
    initTypewriter(".hero-date", { startDelay: 0, charDelay: 100 });

    await vi.advanceTimersByTimeAsync(50);
    expect(document.querySelector(".hero-date").textContent).toBe("");

    await vi.advanceTimersByTimeAsync(60); // 110ms total — first char
    expect(document.querySelector(".hero-date").textContent).toBe("A");

    await vi.advanceTimersByTimeAsync(100); // 210ms total — second char
    expect(document.querySelector(".hero-date").textContent).toBe("AB");
  });
});

describe("initTypewriter — fallback text", () => {
  it("uses element textContent as fallback when data-typewriter is absent", async () => {
    document.body.innerHTML = `<span class="hero-date">Fallback</span>`;
    initTypewriter(".hero-date", { startDelay: 0, charDelay: 50 });

    await vi.advanceTimersByTimeAsync(500);
    expect(document.querySelector(".hero-date").textContent).toBe("Fallback");
  });
});

describe("initTypewriter — CSS class", () => {
  it("adds typewriter-active class while typing", async () => {
    document.body.innerHTML = `<span class="hero-date" data-typewriter="Hi"></span>`;
    initTypewriter(".hero-date", { startDelay: 0, charDelay: 50 });

    await vi.advanceTimersByTimeAsync(10);
    expect(document.querySelector(".hero-date").classList.contains("typewriter-active")).toBe(true);
  });

  it("removes typewriter-active class after typing finishes and cursor delay passes", async () => {
    document.body.innerHTML = `<span class="hero-date" data-typewriter="Hi"></span>`;
    initTypewriter(".hero-date", { startDelay: 0, charDelay: 50 });

    // Finish typing: 2 chars × 50ms = 100ms + 1800ms cursor fade
    await vi.advanceTimersByTimeAsync(2100);
    expect(document.querySelector(".hero-date").classList.contains("typewriter-active")).toBe(false);
  });
});

describe("initTypewriter — edge cases", () => {
  it("does nothing when selector matches no element", () => {
    expect(() =>
      initTypewriter(".nonexistent", { startDelay: 0, charDelay: 50 })
    ).not.toThrow();
  });

  it("handles empty string gracefully", async () => {
    document.body.innerHTML = `<span class="hero-date" data-typewriter=""></span>`;
    expect(() =>
      initTypewriter(".hero-date", { startDelay: 0, charDelay: 50 })
    ).not.toThrow();
    await vi.advanceTimersByTimeAsync(100);
    expect(document.querySelector(".hero-date").textContent).toBe("");
  });

  it("handles special characters and emoji", async () => {
    document.body.innerHTML = `<span class="hero-date" data-typewriter="♡ Love ♡"></span>`;
    initTypewriter(".hero-date", { startDelay: 0, charDelay: 10 });
    await vi.advanceTimersByTimeAsync(200);
    expect(document.querySelector(".hero-date").textContent).toBe("♡ Love ♡");
  });
});
