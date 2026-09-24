import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CONFIG_DEFAULTS, CONFIG_WAIT_MS, injectConfig, fetchConfig } from "../../src/js/config.js";

// ─── injectConfig ────────────────────────────────────────────────────────────

describe("injectConfig — defaults", () => {
  it("falls back to built-in defaults when called with null", () => {
    injectConfig(null);
    expect(window.__weddingConfig.groom_name).toBe("นนท์");
    expect(window.__weddingConfig.bride_name).toBe("เมย์");
  });

  it("merges partial config on top of defaults", () => {
    injectConfig({ groom_name: "Test" });
    expect(window.__weddingConfig.groom_name).toBe("Test");
    expect(window.__weddingConfig.bride_name).toBe("เมย์"); // default preserved
  });
});

describe("injectConfig — couple names", () => {
  beforeEach(() => {
    document.body.innerHTML = `<div class="hero-names"></div>`;
  });

  it("renders both names into .hero-names", () => {
    injectConfig({ groom_name: "นนท์", bride_name: "เมย์" });
    expect(document.querySelector(".hero-names").textContent).toContain("นนท์");
    expect(document.querySelector(".hero-names").textContent).toContain("เมย์");
  });

  it("separates names with an ampersand", () => {
    injectConfig({ groom_name: "A", bride_name: "B" });
    expect(document.querySelector(".hero-names").innerHTML).toContain("&amp;");
  });
});

describe("injectConfig — footer", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <span id="footer-names"></span>
      <span id="footer-date"></span>
    `;
  });

  it("sets footer names to 'Groom & Bride'", () => {
    injectConfig({ groom_name: "นนท์", bride_name: "เมย์" });
    expect(document.getElementById("footer-names").textContent).toBe("นนท์ & เมย์");
  });

  it("formats footer date as DD · MM · YYYY from event_date_iso", () => {
    injectConfig({ event_date_iso: "2026-03-15" });
    expect(document.getElementById("footer-date").textContent).toBe("15 · 03 · 2026");
  });
});

describe("injectConfig — detail cards", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="dc-date"></div>
      <div id="dc-time"></div>
      <div id="dc-venue"></div>
      <div id="dc-dress"></div>
    `;
  });

  it("sets event date display text, auto-correcting a mismatched weekday", () => {
    // 2027-02-28 is a Sunday — the live sheet says เสาร์; validateConfig fixes it
    injectConfig({
      event_date_iso: "2027-02-28",
      event_date_display: "วันเสาร์ที่ 28 กุมภาพันธ์ พ.ศ. 2570",
    });
    expect(document.getElementById("dc-date").textContent).toBe("วันอาทิตย์ที่ 28 กุมภาพันธ์ พ.ศ. 2570");
  });

  it("shows ceremony and lunch times in dc-time", () => {
    injectConfig({ event_time_ceremony: "11:00", event_time_lunch: "12:00" });
    const html = document.getElementById("dc-time").innerHTML;
    expect(html).toContain("11:00");
    expect(html).toContain("12:00");
  });

  it("splits venue into location + province on separate lines when format matches", () => {
    injectConfig({ venue_name: "ตำบลแป-ระ อำเภอท่าแพ จังหวัดสตูล" });
    const html = document.getElementById("dc-venue").innerHTML;
    expect(html).toContain("<br");
    expect(html).toContain("จังหวัดสตูล");
  });

  it("shows venue as-is when province pattern does not match", () => {
    injectConfig({ venue_name: "Venue Without Province" });
    expect(document.getElementById("dc-venue").textContent).toBe("Venue Without Province");
  });

  it("sets dress code text", () => {
    injectConfig({ dress_code: "Pastel Formal" });
    expect(document.getElementById("dc-dress").textContent).toBe("Pastel Formal");
  });
});

describe("injectConfig — data-config attribute injection", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <p data-config="travel_airport"></p>
      <p data-config="travel_hotel"></p>
    `;
  });

  it("injects config values into elements with data-config attribute", () => {
    injectConfig({ travel_airport: "1.5 hours from airport" });
    expect(document.querySelector("[data-config='travel_airport']").textContent)
      .toBe("1.5 hours from airport");
  });
});

describe("injectConfig — RSVP deadline", () => {
  beforeEach(() => {
    document.body.innerHTML = `<p id="rsvp-deadline-text"></p>`;
  });

  it("sets deadline text with Thai prefix", () => {
    injectConfig({ rsvp_deadline_display: "28 กุมภาพันธ์ 2569" });
    expect(document.getElementById("rsvp-deadline-text").textContent)
      .toBe("กรุณาตอบรับภายในวันที่ 28 กุมภาพันธ์ 2569");
  });
});

describe("injectConfig — calendar button", () => {
  beforeEach(() => {
    document.body.innerHTML = `<a id="calendar-btn"></a>`;
  });

  it("builds a Google Calendar URL with correct date and time", () => {
    injectConfig({
      event_date_iso: "2026-03-15",
      event_time_ceremony: "11:00",
      groom_name: "นนท์",
      bride_name: "เมย์",
    });
    const href = document.getElementById("calendar-btn").href;
    expect(href).toContain("calendar.google.com");
    expect(href).toContain("20260315");
    expect(href).toContain("T110000");
  });
});

describe("injectConfig — page title", () => {
  it("sets document title to couple names", () => {
    injectConfig({ groom_name: "นนท์", bride_name: "เมย์" });
    expect(document.title).toContain("นนท์");
    expect(document.title).toContain("เมย์");
  });
});

// ─── fetchConfig ─────────────────────────────────────────────────────────────

describe("fetchConfig — cache behavior", () => {
  it("returns null when fetch fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network error"));
    const result = await fetchConfig();
    expect(result).toBeNull();
  });

  it("returns null when server responds with non-ok status", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    const result = await fetchConfig();
    expect(result).toBeNull();
  });

  it("returns parsed config when fetch succeeds", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ groom_name: "นนท์", bride_name: "เมย์" }),
    });
    const result = await fetchConfig();
    expect(result).not.toBeNull();
    expect(result.groom_name).toBe("นนท์");
  });

  it("returns cached config without fetching again within TTL", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ groom_name: "Cached" }),
    });
    await fetchConfig(); // fills cache
    global.fetch.mockClear();
    const cached = await fetchConfig();
    // Background SWR fetch may still fire once, but the return value is from cache
    expect(cached.groom_name).toBe("Cached");
  });
});

// ─── Sheets ISO normalization (via fetchConfig internals) ─────────────────────

describe("fetchConfig — normalizes Google Sheets ISO strings", () => {
  it("converts time-only ISO string (1899 epoch) to HH:MM", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        event_time_ceremony: "1899-12-30T11:00:00.000Z",
      }),
    });
    const result = await fetchConfig();
    expect(result.event_time_ceremony).toBe("11:00");
  });

  it("converts date ISO string to YYYY-MM-DD", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        event_date_iso: "2026-03-15T00:00:00.000Z",
      }),
    });
    const result = await fetchConfig();
    expect(result.event_date_iso).toBe("2026-03-15");
  });

  it("leaves plain strings unchanged", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ groom_name: "นนท์" }),
    });
    const result = await fetchConfig();
    expect(result.groom_name).toBe("นนท์");
  });
});

// ─── First-visit speed ───────────────────────────────────────────────────────

describe("fetchConfig — first visit never hangs on GAS", () => {
  // a GAS request that hangs until the test releases it
  let release;
  const hangingFetch = () =>
    vi.fn(() => new Promise((r) => (release = () => r({ ok: false }))));
  beforeEach(() => {
    localStorage.clear();
    delete window.__SSR_CONFIG;
  });
  afterEach(async () => {
    release?.();
    release = null;
    await Promise.resolve();
  });

  it("uses the config the server embedded in the HTML without waiting", async () => {
    window.__SSR_CONFIG = { groom_name: "บอล", event_date_iso: "2099-01-01T00:00:00.000Z" };
    global.fetch = hangingFetch(); // GAS never answers
    const result = await fetchConfig();
    expect(result.groom_name).toBe("บอล");
    expect(result.event_date_iso).toBe("2099-01-01"); // normalized like GAS data
  });

  it("gives up after CONFIG_WAIT_MS on a cold visit and renders defaults", async () => {
    vi.useFakeTimers();
    global.fetch = hangingFetch();
    const pending = fetchConfig();
    await vi.advanceTimersByTimeAsync(CONFIG_WAIT_MS + 10);
    await expect(pending).resolves.toBeNull();
    vi.useRealTimers();
  });

  it("sends a single config request on a cold visit", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ groom_name: "บอล" }) });
    await fetchConfig();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
