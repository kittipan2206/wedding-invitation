import { describe, it, expect, vi, afterEach } from "vitest";
import {
  cleanDisplayString,
  fixWeekday,
  validateConfig,
} from "../../src/js/config.js";

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── cleanDisplayString ──────────────────────────────────────────────────────

describe("cleanDisplayString", () => {
  it("strips trailing periods and whitespace", () => {
    expect(cleanDisplayString("31 พฤษภาคม 2569.")).toBe("31 พฤษภาคม 2569");
    expect(cleanDisplayString("31 พฤษภาคม 2569 . ")).toBe("31 พฤษภาคม 2569");
  });

  it("leaves clean strings untouched", () => {
    expect(cleanDisplayString("28 กุมภาพันธ์ 2569")).toBe("28 กุมภาพันธ์ 2569");
  });

  it("passes through non-strings", () => {
    expect(cleanDisplayString(undefined)).toBe(undefined);
    expect(cleanDisplayString(null)).toBe(null);
  });
});

// ─── fixWeekday ──────────────────────────────────────────────────────────────

describe("fixWeekday", () => {
  it("corrects a mismatched Thai weekday (2026-08-01 is Saturday)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fixed = fixWeekday("วันอาทิตย์ที่ 1 สิงหาคม พ.ศ. 2569", "2026-08-01");
    expect(fixed).toBe("วันเสาร์ที่ 1 สิงหาคม พ.ศ. 2569");
    expect(warn).toHaveBeenCalledOnce();
  });

  it("keeps a correct weekday and stays silent", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const ok = fixWeekday("วันเสาร์ที่ 1 สิงหาคม พ.ศ. 2569", "2026-08-01");
    expect(ok).toBe("วันเสาร์ที่ 1 สิงหาคม พ.ศ. 2569");
    expect(warn).not.toHaveBeenCalled();
  });

  it("corrects the 2026-03-15 default (Sunday, not Saturday)", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fixed = fixWeekday("วันเสาร์ที่ 15 มีนาคม พ.ศ. 2569", "2026-03-15");
    expect(fixed).toBe("วันอาทิตย์ที่ 15 มีนาคม พ.ศ. 2569");
  });

  it("ignores displays without a weekday word", () => {
    expect(fixWeekday("15 มีนาคม พ.ศ. 2569", "2026-03-15")).toBe(
      "15 มีนาคม พ.ศ. 2569",
    );
  });

  it("ignores invalid or missing iso dates", () => {
    const display = "วันเสาร์ที่ 1 สิงหาคม พ.ศ. 2569";
    expect(fixWeekday(display, undefined)).toBe(display);
    expect(fixWeekday(display, "not-a-date")).toBe(display);
  });
});

// ─── validateConfig ──────────────────────────────────────────────────────────

describe("validateConfig", () => {
  it("cleans and weekday-fixes event_date_display", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = validateConfig({
      event_date_display: "วันอาทิตย์ที่ 1 สิงหาคม พ.ศ. 2569.",
      event_date_iso: "2026-08-01",
    });
    expect(out.event_date_display).toBe("วันเสาร์ที่ 1 สิงหาคม พ.ศ. 2569");
  });

  it("cleans rsvp_deadline_display", () => {
    const out = validateConfig({ rsvp_deadline_display: "31 พฤษภาคม 2569." });
    expect(out.rsvp_deadline_display).toBe("31 พฤษภาคม 2569");
  });

  it("warns when RSVP deadline passed but event is upcoming", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const past = "2000-01-01";
    const future = "2099-01-01";
    validateConfig({ rsvp_deadline_iso: past, event_date_iso: future });
    expect(warn).toHaveBeenCalled();
  });

  it("does not warn when deadline is still open", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    validateConfig({
      rsvp_deadline_iso: "2099-01-01",
      event_date_iso: "2099-02-01",
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("does not mutate the input object", () => {
    const input = { rsvp_deadline_display: "x." };
    validateConfig(input);
    expect(input.rsvp_deadline_display).toBe("x.");
  });
});
