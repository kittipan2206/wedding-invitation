import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { initHearts } from "../../src/js/hearts.js";

vi.mock("../../src/js/bloom.js", () => ({ burstBloom: vi.fn() }));

// Regression guard: the GAS doPost treats any unrecognized POST as an RSVP
// (blank row + Telegram notification). The heart button must therefore NEVER
// POST unless GET ?type=hearts confirmed backend support first.

function setupDOM() {
  document.body.innerHTML = `
    <button id="send-heart-btn"></button>
    <span class="heart-count-wrap" style="display: none">
      <span id="heart-count">0</span>
    </span>`;
}

function flushPromises() {
  return new Promise((r) => setTimeout(r, 0));
}

describe("initHearts — backend capability gating", () => {
  beforeEach(() => {
    setupDOM();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does NOT POST when the hearts endpoint is unsupported", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ error: "unknown" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    initHearts();
    await flushPromises();
    document.getElementById("send-heart-btn").click();
    await flushPromises();

    const posts = fetchMock.mock.calls.filter(
      ([, opts]) => opts?.method === "POST",
    );
    expect(posts).toHaveLength(0);
  });

  it("does NOT POST when the probe request fails entirely", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    initHearts();
    await flushPromises();
    document.getElementById("send-heart-btn").click();
    await flushPromises();

    const posts = fetchMock.mock.calls.filter(
      ([, opts]) => opts?.method === "POST",
    );
    expect(posts).toHaveLength(0);
  });

  it("POSTs a heart only after the probe returns a count", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ count: 42 }) });
    vi.stubGlobal("fetch", fetchMock);

    initHearts();
    await flushPromises();
    document.getElementById("send-heart-btn").click();
    await flushPromises();

    const posts = fetchMock.mock.calls.filter(
      ([, opts]) => opts?.method === "POST",
    );
    expect(posts).toHaveLength(1);
    expect(posts[0][1].body).toContain('"type":"heart"');
  });

  it("shows and increments the counter when supported", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ count: 42 }) });
    vi.stubGlobal("fetch", fetchMock);

    initHearts();
    await flushPromises();

    const wrap = document.querySelector(".heart-count-wrap");
    expect(wrap.style.display).toBe("inline");
    expect(document.getElementById("heart-count").textContent).toBe("42");

    document.getElementById("send-heart-btn").click();
    expect(document.getElementById("heart-count").textContent).toBe("43");
  });

  it("keeps the counter hidden when unsupported", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: false, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    initHearts();
    await flushPromises();

    expect(document.querySelector(".heart-count-wrap").style.display).toBe(
      "none",
    );
  });
});
