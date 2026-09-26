import { describe, it, expect } from "vitest";
import { farewellLine } from "../../src/js/footer-env.js";

describe("closing envelope farewell line", () => {
  const iso = "2027-02-28";

  it("before the day: see you on the date (Thai short month)", () => {
    expect(farewellLine(iso, new Date("2026-12-01T12:00:00+07:00"))).toBe(
      "แล้วพบกันวันที่ 28 ก.พ. ♡",
    );
  });

  it("on the day (Bangkok time): see you today", () => {
    expect(farewellLine(iso, new Date("2027-02-28T07:00:00+07:00"))).toBe(
      "แล้วพบกันวันนี้นะ ♡",
    );
  });

  it("after the day: thank you", () => {
    expect(farewellLine(iso, new Date("2027-03-01T00:30:00+07:00"))).toBe(
      "ขอบคุณที่มาร่วมงานของเรา ♡",
    );
  });
});
