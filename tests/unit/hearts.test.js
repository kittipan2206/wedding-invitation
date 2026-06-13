import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { initHearts } from "../../src/js/hearts.js";

vi.mock("../../src/js/bloom.js", () => ({ burstBloom: vi.fn() }));

// Regression guard: the GAS doPost treats any unrecognized POST as an RSVP
// (blank row + Telegram notification). The heart button must therefore NEVER
// POST unless GET ?type=hearts confirmed backend support first.
// Rapid taps must also batch into a single {type:"heart", count:N} POST.

function setupDOM() {
  document.body.innerHTML = `
    <button id="send-heart-btn"></button>
    <span class="heart-count-wrap" style="display: none">
      <span id="heart-count">0</span>
    </span>`;
}

function postsOf(fetchMock) {
  return fetchMock.mock.calls.filter(([, opts]) => opts?.method === "POST");
}

describe("initHearts — backend capability gating + batching", () => {
  beforeEach(() => {
    setupDOM();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does NOT POST when the hearts endpoint is unsupported", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: "unknown" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    initHearts();
    await vi.advanceTimersByTimeAsync(0);
    document.getElementById("send-heart-btn").click();
    await vi.advanceTimersByTimeAsync(2000);

    expect(postsOf(fetchMock)).toHaveLength(0);
  });

  it("does NOT POST when the probe request fails entirely", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    initHearts();
    await vi.advanceTimersByTimeAsync(0);
    document.getElementById("send-heart-btn").click();
    await vi.advanceTimersByTimeAsync(2000);

    expect(postsOf(fetchMock)).toHaveLength(0);
  });

  it("batches rapid taps into a single POST with a count", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ count: 42 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    initHearts();
    await vi.advanceTimersByTimeAsync(0);

    const btn = document.getElementById("send-heart-btn");
    btn.click();
    btn.click();
    btn.click();
    await vi.advanceTimersByTimeAsync(2000);

    const posts = postsOf(fetchMock);
    expect(posts).toHaveLength(1);
    const body = JSON.parse(posts[0][1].body);
    expect(body.type).toBe("heart");
    expect(body.count).toBe(3);
  });

  it("does not POST before the flush delay elapses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ count: 1 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    initHearts();
    await vi.advanceTimersByTimeAsync(0);

    document.getElementById("send-heart-btn").click();
    await vi.advanceTimersByTimeAsync(300);
    expect(postsOf(fetchMock)).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(1000);
    expect(postsOf(fetchMock)).toHaveLength(1);
  });

  it("shows and increments the counter when supported", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ count: 42 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    initHearts();
    await vi.advanceTimersByTimeAsync(0);

    const wrap = document.querySelector(".heart-count-wrap");
    expect(wrap.style.display).toBe("inline");
    expect(document.getElementById("heart-count").textContent).toBe("42");

    document.getElementById("send-heart-btn").click();
    // Counter updates when flush fires (after FLUSH_DELAY_MS), not immediately on click
    await vi.advanceTimersByTimeAsync(1000);
    expect(document.getElementById("heart-count").textContent).toBe("43");
  });

  it("keeps the counter hidden when unsupported", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    initHearts();
    await vi.advanceTimersByTimeAsync(0);

    expect(document.querySelector(".heart-count-wrap").style.display).toBe(
      "none",
    );
  });
});
