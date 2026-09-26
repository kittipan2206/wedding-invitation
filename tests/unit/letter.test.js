import { describe, it, expect } from "vitest";
import { clipName, letterContent } from "../../src/js/letter.js";

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

describe("clipName — ?to= values made safe to show", () => {
  it("keeps normal names as-is (trimmed)", () => {
    expect(clipName("  คุณสมชาย และครอบครัว ")).toBe("คุณสมชาย และครอบครัว");
  });

  it("cuts over-long names at 40 graphemes, never splitting a tone mark", () => {
    const out = clipName("ต้น".repeat(30)); // 60 graphemes: ต้ + น
    expect(out.endsWith("…")).toBe(true);
    expect(Array.from(new Intl.Segmenter("th", { granularity: "grapheme" }).segment(out))).toHaveLength(40);
    expect(out.at(-2)).not.toBe("ต"); // "ต้" stays whole — ends on a full grapheme
  });

  it("drops control characters", () => {
    expect(clipName("ต้น\n\u0007")).toBe("ต้น");
  });
});
