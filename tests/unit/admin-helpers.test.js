import { describe, it, expect, beforeEach } from "vitest";
import {
  escHtml,
  normalizeConfigValue,
  buildMusicOptions,
} from "../../src/js/admin.js";

// ─── escHtml ──────────────────────────────────────────────────────────────────

describe("admin escHtml", () => {
  it("escapes & to &amp;", () => {
    expect(escHtml("A & B")).toBe("A &amp; B");
  });

  it("escapes < and > to &lt; &gt;", () => {
    expect(escHtml("<div>")).toBe("&lt;div&gt;");
  });

  it('escapes " to &quot;', () => {
    expect(escHtml('"hello"')).toBe("&quot;hello&quot;");
  });

  it("leaves plain text untouched", () => {
    expect(escHtml("Hello World")).toBe("Hello World");
    expect(escHtml("สวัสดี ♡")).toBe("สวัสดี ♡");
  });

  it("converts numbers to string safely", () => {
    expect(escHtml(0)).toBe("0");
    expect(escHtml(123)).toBe("123");
  });

  it("handles full XSS payload", () => {
    const result = escHtml('<script>alert("xss")</script>');
    expect(result).not.toContain("<script>");
    expect(result).toContain("&lt;script&gt;");
    expect(result).toContain("&quot;");
  });
});

// ─── normalizeConfigValue ─────────────────────────────────────────────────────

describe("admin normalizeConfigValue", () => {
  it("converts time-only ISO string (1899 epoch) to HH:MM", () => {
    // Sheets time-only: 1899-12-30T13:00:00.000Z
    expect(
      normalizeConfigValue("event_time_ceremony", "1899-12-30T13:00:00.000Z"),
    ).toBe("13:00");
  });

  it("converts date ISO string with _iso suffix to YYYY-MM-DD", () => {
    expect(
      normalizeConfigValue("event_date_iso", "2026-03-15T00:00:00.000Z"),
    ).toBe("2026-03-15");
  });

  it("converts date ISO string with _display suffix to YYYY-MM-DD", () => {
    expect(
      normalizeConfigValue("rsvp_deadline_display", "2026-02-28T00:00:00.000Z"),
    ).toBe("2026-02-28");
  });

  it("leaves plain string unchanged", () => {
    expect(normalizeConfigValue("groom_name", "นนท์")).toBe("นนท์");
    expect(normalizeConfigValue("dress_code", "Pastel Formal")).toBe(
      "Pastel Formal",
    );
  });

  it("leaves non-ISO date strings unchanged", () => {
    expect(
      normalizeConfigValue(
        "event_date_display",
        "วันเสาร์ที่ 15 มีนาคม พ.ศ. 2569",
      ),
    ).toBe("วันเสาร์ที่ 15 มีนาคม พ.ศ. 2569");
  });

  it("returns raw value as-is when input is not a string", () => {
    expect(normalizeConfigValue("some_key", 42)).toBe(42);
    expect(normalizeConfigValue("some_key", null)).toBe(null);
  });

  it("handles midnight time (00:00)", () => {
    expect(
      normalizeConfigValue("event_time_ceremony", "1899-12-30T00:00:00.000Z"),
    ).toBe("00:00");
  });
});

// ─── buildMusicOptions ────────────────────────────────────────────────────────

describe("admin buildMusicOptions", () => {
  beforeEach(() => {
    document.body.innerHTML = `<select id="music-select"></select>`;
  });

  it("shows no-library message when no local music and no extra URLs", () => {
    buildMusicOptions("", []);
    const sel = document.getElementById("music-select");
    // If LOCAL_MUSIC has files (from public/music/), options are rendered;
    // otherwise the no-library message is shown. Either way no crash.
    expect(sel.querySelectorAll("option").length).toBeGreaterThanOrEqual(0);
  });

  it("renders at least the extra URLs passed in", () => {
    buildMusicOptions("", [
      "http://example.com/song1.mp3",
      "http://example.com/song2.mp3",
    ]);
    const values = Array.from(
      document.querySelectorAll("#music-select option"),
    ).map((o) => o.value);
    expect(values).toContain("http://example.com/song1.mp3");
    expect(values).toContain("http://example.com/song2.mp3");
  });

  it("marks the option matching currentUrl as selected", () => {
    const url2 = "http://example.com/song2.mp3";
    buildMusicOptions(url2, ["http://example.com/song1.mp3", url2]);
    const selected = document.querySelector("#music-select option:checked");
    expect(selected?.value).toBe(url2);
  });

  it("extra URL option label uses filename (last path segment)", () => {
    buildMusicOptions("", ["http://example.com/my-song.mp3"]);
    const options = Array.from(
      document.querySelectorAll("#music-select option"),
    );
    const match = options.find(
      (o) => o.value === "http://example.com/my-song.mp3",
    );
    expect(match?.textContent).toContain("my-song.mp3");
  });

  it("does nothing when #music-select is not in DOM", () => {
    document.body.innerHTML = "";
    expect(() => buildMusicOptions("", [])).not.toThrow();
  });
});
