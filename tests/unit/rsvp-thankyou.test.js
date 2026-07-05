import { describe, it, expect, beforeEach } from "vitest";
import { fillThankYou } from "../../src/js/rsvp.js";

const CFG = { event_date_display: "วันเสาร์ที่ 1 สิงหาคม พ.ศ. 2642" };

describe("fillThankYou", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <h2 id="ty-heading">ขอบคุณมาก ♡</h2>
      <p id="ty-msg"></p>
      <div id="ty-calendar" style="display: none"></div>`;
  });

  it("greets an attending guest by name and shows the calendar nudge", () => {
    fillThankYou({ name: "สมชาย", attending: true }, CFG);
    expect(document.getElementById("ty-heading").textContent).toBe(
      "ขอบคุณ คุณสมชาย ♡",
    );
    expect(document.getElementById("ty-msg").textContent).toContain(
      "1 สิงหาคม",
    );
    expect(document.getElementById("ty-calendar").style.display).toBe("block");
  });

  it("does not stack a second คุณ when the name already has one", () => {
    fillThankYou({ name: "คุณสมชาย", attending: true }, CFG);
    expect(document.getElementById("ty-heading").textContent).toBe(
      "ขอบคุณ คุณสมชาย ♡",
    );
  });

  it("shows a warm decline message without calendar buttons", () => {
    fillThankYou({ name: "สมปอง", attending: false }, CFG);
    expect(document.getElementById("ty-heading").textContent).toContain(
      "คุณสมปอง",
    );
    expect(document.getElementById("ty-msg").textContent).toContain(
      "โอกาสหน้า",
    );
    expect(document.getElementById("ty-calendar").style.display).toBe("none");
  });

  it("falls back to a generic date line when config is missing", () => {
    fillThankYou({ name: "สมชาย", attending: true }, null);
    expect(document.getElementById("ty-msg").textContent).toContain("วันพิเศษ");
  });

  it("keeps the default heading when the name is missing", () => {
    fillThankYou({ name: "", attending: true }, CFG);
    expect(document.getElementById("ty-heading").textContent).toBe(
      "ขอบคุณมาก ♡",
    );
  });
});
