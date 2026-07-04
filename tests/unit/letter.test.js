import { describe, it, expect, vi, beforeEach } from "vitest";
import { letterContent, showLetter } from "../../src/js/letter.js";

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

describe("showLetter", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    window.__weddingConfig = { groom_name: "นนท์", bride_name: "เมย์" };
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the overlay with a continue button", () => {
    showLetter(() => {});
    expect(document.getElementById("letter-overlay")).toBeTruthy();
    expect(document.querySelector(".letter-continue")).toBeTruthy();
  });

  it("removes the overlay and calls onDone when continue is clicked", () => {
    const onDone = vi.fn();
    showLetter(onDone);
    document.querySelector(".letter-continue").click();
    vi.advanceTimersByTime(500);
    expect(document.getElementById("letter-overlay")).toBeFalsy();
    expect(onDone).toHaveBeenCalledOnce();
  });

  it("calls onDone only once even with repeated clicks", () => {
    const onDone = vi.fn();
    showLetter(onDone);
    const btn = document.querySelector(".letter-continue");
    btn.click();
    btn.click();
    vi.advanceTimersByTime(1000);
    expect(onDone).toHaveBeenCalledOnce();
  });
});
