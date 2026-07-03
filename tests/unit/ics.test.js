import { describe, it, expect } from "vitest";
import { icsEscape, icsUtcStamp, buildIcs } from "../../src/js/ics.js";

describe("icsEscape", () => {
  it("escapes commas, semicolons, backslashes, and newlines", () => {
    expect(icsEscape("a,b;c\nd\\e")).toBe("a\\,b\\;c\\nd\\\\e");
  });

  it("escapes CRLF newlines as a single \\n", () => {
    expect(icsEscape("บรรทัดแรก\r\nบรรทัดสอง")).toBe("บรรทัดแรก\\nบรรทัดสอง");
  });

  it("handles null/undefined as empty string", () => {
    expect(icsEscape(null)).toBe("");
    expect(icsEscape(undefined)).toBe("");
  });
});

describe("icsUtcStamp", () => {
  it("converts Bangkok time to UTC basic format", () => {
    expect(icsUtcStamp("2027-02-28", "09:00")).toBe("20270228T020000Z");
    expect(icsUtcStamp("2026-03-15", "11:00")).toBe("20260315T040000Z");
  });

  it("crosses to the previous day when local time is before 07:00", () => {
    expect(icsUtcStamp("2027-02-28", "03:00")).toBe("20270227T200000Z");
  });

  it("falls back to midnight when time is malformed", () => {
    expect(icsUtcStamp("2027-02-28", "not-a-time")).toBe("20270227T170000Z");
  });
});

describe("buildIcs", () => {
  const cfg = {
    groom_name: "นนท์",
    bride_name: "เมย์",
    event_date_iso: "2027-02-28",
    event_time_ceremony: "09:00",
    venue_name: "ตำบลแป-ระ, อำเภอท่าแพ, จังหวัดสตูล",
  };
  const now = new Date("2026-07-04T10:00:00Z");

  it("produces a valid VCALENDAR/VEVENT structure with CRLF line endings", () => {
    const ics = buildIcs(cfg, now);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("\r\nBEGIN:VEVENT\r\n");
    expect(ics).toContain("\r\nEND:VEVENT\r\n");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    // No bare LF lines
    expect(ics.replace(/\r\n/g, "")).not.toContain("\n");
  });

  it("sets DTSTART from ceremony time and DTEND at 16:00 Bangkok", () => {
    const ics = buildIcs(cfg, now);
    expect(ics).toContain("DTSTART:20270228T020000Z");
    expect(ics).toContain("DTEND:20270228T090000Z");
  });

  it("escapes commas in LOCATION so they do not split the field", () => {
    const ics = buildIcs(cfg, now);
    expect(ics).toContain("LOCATION:ตำบลแป-ระ\\, อำเภอท่าแพ\\, จังหวัดสตูล");
  });

  it("includes couple names in SUMMARY", () => {
    const ics = buildIcs(cfg, now);
    expect(ics).toContain("SUMMARY:งานแต่งงาน นนท์ & เมย์");
  });

  it("accepts a full ISO datetime in event_date_iso (GAS format)", () => {
    const ics = buildIcs(
      { ...cfg, event_date_iso: "2027-02-28T00:00:00.000Z" },
      now,
    );
    expect(ics).toContain("DTSTART:20270228T020000Z");
  });

  it("falls back to defaults when config is missing", () => {
    const ics = buildIcs(null, now);
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("SUMMARY:");
    expect(ics).toMatch(/DTSTART:\d{8}T\d{6}Z/);
  });

  it("uses a stable UID so re-imports update the same event", () => {
    const a = buildIcs(cfg, now);
    const b = buildIcs({ ...cfg, event_date_iso: "2027-03-06" }, now);
    const uidA = a.match(/UID:(.+)/)[1];
    const uidB = b.match(/UID:(.+)/)[1];
    expect(uidA).toBe(uidB);
  });

  it("stamps DTSTAMP from the provided clock", () => {
    const ics = buildIcs(cfg, now);
    expect(ics).toContain("DTSTAMP:20260704T100000Z");
  });
});
