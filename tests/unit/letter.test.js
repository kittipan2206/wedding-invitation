import { describe, it, expect } from "vitest";
import { letterContent } from "../../src/js/letter.js";

describe("letterContent", () => {
  const cfg = {
    groom_name: "นนท์",
    bride_name: "เมย์",
    event_date_display: "วันเสาร์ที่ 1 สิงหาคม พ.ศ. 2569",
  };

  it("addresses the guest by name when given", () => {
    expect(letterContent(cfg, "สมชาย").to).toBe("ถึง คุณสมชาย");
  });

  it("does not stack a second คุณ when the name already has one", () => {
    expect(letterContent(cfg, "คุณสมชาย").to).toBe("ถึง คุณสมชาย");
  });

  it("falls back to a generic salutation without a guest name", () => {
    expect(letterContent(cfg, null).to).toBe("ถึงคนสำคัญของเรา");
  });

  it("mentions the event date in the body", () => {
    expect(letterContent(cfg, null).body).toContain("1 สิงหาคม");
  });

  it("signs with both names", () => {
    const { sign } = letterContent(cfg, null);
    expect(sign).toContain("นนท์");
    expect(sign).toContain("เมย์");
  });

  it("uses defaults when config is missing", () => {
    const { to, sign } = letterContent(null, null);
    expect(to).toBe("ถึงคนสำคัญของเรา");
    expect(sign).toContain("นนท์");
  });
});
