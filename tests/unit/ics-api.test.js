import { describe, it, expect } from "vitest";
import handler from "../../api/ics.js";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function run(query = {}, ua = DESKTOP_UA) {
  const req = { query, headers: { "user-agent": ua } };
  const res = {
    headers: {},
    body: null,
    statusCode: null,
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(body) {
      this.body = body;
    },
  };
  handler(req, res);
  return res;
}

describe("api/ics handler", () => {
  it("builds an ICS from valid query params", () => {
    const res = run({
      date: "2027-02-28",
      start: "09:00",
      groom: "นนท์",
      bride: "เมย์",
      venue: "ตำบลแป-ระ, อำเภอท่าแพ",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("BEGIN:VCALENDAR");
    expect(res.body).toContain("SUMMARY:งานแต่งงาน นนท์ & เมย์");
    // 2027-02-28 09:00 Bangkok → 02:00 UTC
    expect(res.body).toContain("DTSTART:20270228T020000Z");
    // Commas in the venue must be escaped per RFC 5545
    expect(res.body).toContain("LOCATION:ตำบลแป-ระ\\, อำเภอท่าแพ");
  });

  it("falls back to config defaults when params are missing or invalid", () => {
    const res = run({ date: "28/02/2027", start: "late morning" });
    // CONFIG_DEFAULTS: 2026-03-15 11:00 Bangkok → 04:00 UTC
    expect(res.body).toContain("DTSTART:20260315T040000Z");
    expect(res.body).toContain("SUMMARY:งานแต่งงาน นนท์ & เมย์");
  });

  it("caps oversized text params instead of echoing them", () => {
    const res = run({ venue: "ย".repeat(500) });
    const location = res.body
      .split("\r\n")
      .find((l) => l.startsWith("LOCATION:"));
    expect(location.length).toBeLessThanOrEqual("LOCATION:".length + 150);
  });

  it("serves text/calendar with no-store caching", () => {
    const res = run();
    expect(res.headers["content-type"]).toBe("text/calendar; charset=utf-8");
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("previews inline on iOS but downloads as attachment elsewhere", () => {
    expect(run({}, IPHONE_UA).headers["content-disposition"]).toContain(
      "inline",
    );
    expect(run({}, DESKTOP_UA).headers["content-disposition"]).toContain(
      "attachment",
    );
  });
});
