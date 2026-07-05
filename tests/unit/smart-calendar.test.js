import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { initSmartCalendar } from "../../src/js/smart-calendar.js";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const MAC_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
const WINDOWS_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function mountClusters() {
  document.body.innerHTML = `
    <div class="map-actions">
      <a id="map-navigate-btn" class="map-btn map-btn--navigate"
        ><span class="map-btn-label">นำทางเลย</span></a
      >
      <a id="calendar-btn" class="map-btn map-btn--calendar"
        ><span class="map-btn-label">บันทึกปฏิทิน</span></a
      >
      <button id="calendar-ics-btn" class="map-btn map-btn--calendar">
        <span class="map-btn-label">ปฏิทิน iPhone</span>
      </button>
    </div>
    <div id="map-actions-alt" class="map-actions-alt">
      <a id="map-apple-link" class="cal-alt-link" hidden
        ><span class="map-btn-label">เปิดใน Apple Maps</span></a
      >
      <button id="copy-address-btn" class="cal-alt-link">
        <span class="map-btn-label">คัดลอกที่อยู่</span>
      </button>
    </div>
    <div class="ty-calendar-btns">
      <a id="ty-gcal-btn" class="map-btn map-btn--calendar ty-cal-btn"
        ><span class="map-btn-label">Google Calendar</span></a
      >
      <button id="ty-ics-btn" class="map-btn map-btn--calendar ty-cal-btn">
        <span class="map-btn-label">ปฏิทิน iPhone</span>
      </button>
    </div>
    <div id="ty-cal-alt" class="map-actions-alt ty-cal-alt"></div>
  `;
}

beforeEach(() => {
  mountClusters();
  delete window.__weddingConfig;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("initSmartCalendar — Apple devices", () => {
  it("promotes the .ics option and demotes Google Calendar to an alt link", () => {
    initSmartCalendar({ ua: IPHONE_UA, maxTouchPoints: 5 });

    const ics = document.getElementById("calendar-ics-btn");
    expect(ics.classList.contains("map-btn")).toBe(true);
    expect(ics.querySelector(".map-btn-label").textContent).toBe(
      "บันทึกปฏิทิน",
    );

    const gcal = document.getElementById("calendar-btn");
    expect(gcal.classList.contains("cal-alt-link")).toBe(true);
    expect(gcal.classList.contains("map-btn")).toBe(false);
    expect(gcal.closest("#map-actions-alt")).not.toBeNull();
    expect(gcal.querySelector(".map-btn-label").textContent).toBe(
      "หรือใช้ Google Calendar",
    );
  });

  it("applies the same pairing to the thank-you nudge", () => {
    initSmartCalendar({ ua: IPHONE_UA, maxTouchPoints: 5 });

    const tyIcs = document.getElementById("ty-ics-btn");
    expect(tyIcs.classList.contains("map-btn")).toBe(true);

    const tyGcal = document.getElementById("ty-gcal-btn");
    expect(tyGcal.classList.contains("cal-alt-link")).toBe(true);
    expect(tyGcal.closest("#ty-cal-alt")).not.toBeNull();
  });

  it("unhides the Apple Maps link and points it at the venue", () => {
    window.__weddingConfig = { venue_name: "หาดใหญ่ สงขลา" };
    initSmartCalendar({ ua: IPHONE_UA, maxTouchPoints: 5 });

    const link = document.getElementById("map-apple-link");
    expect(link.hidden).toBe(false);
    expect(link.href).toContain("maps.apple.com");
    expect(link.href).toContain(encodeURIComponent("หาดใหญ่ สงขลา"));
  });

  it("treats iPadOS-reporting-as-Mac as Apple", () => {
    initSmartCalendar({ ua: MAC_UA, maxTouchPoints: 5 });
    expect(
      document
        .getElementById("calendar-btn")
        .classList.contains("cal-alt-link"),
    ).toBe(true);
  });
});

describe("initSmartCalendar — other devices", () => {
  it("keeps Google Calendar primary and demotes the .ics option", () => {
    initSmartCalendar({ ua: WINDOWS_UA, maxTouchPoints: 0 });

    const gcal = document.getElementById("calendar-btn");
    expect(gcal.classList.contains("map-btn")).toBe(true);
    expect(gcal.querySelector(".map-btn-label").textContent).toBe(
      "บันทึกปฏิทิน",
    );

    const ics = document.getElementById("calendar-ics-btn");
    expect(ics.classList.contains("cal-alt-link")).toBe(true);
    expect(ics.closest("#map-actions-alt")).not.toBeNull();
    expect(ics.querySelector(".map-btn-label").textContent).toBe(
      "หรือโหลดไฟล์ .ics (Apple Calendar)",
    );
  });

  it("keeps the Apple Maps link hidden", () => {
    initSmartCalendar({ ua: WINDOWS_UA, maxTouchPoints: 0 });
    expect(document.getElementById("map-apple-link").hidden).toBe(true);
  });
});

describe("click feedback", () => {
  it("flashes a done label on calendar controls, then restores it", () => {
    vi.useFakeTimers();
    initSmartCalendar({ ua: WINDOWS_UA, maxTouchPoints: 0 });

    const gcal = document.getElementById("calendar-btn");
    gcal.click();
    expect(gcal.querySelector(".map-btn-label").textContent).toBe(
      "เปิดปฏิทินให้แล้ว ✓",
    );
    expect(gcal.classList.contains("is-done")).toBe(true);

    vi.advanceTimersByTime(2500);
    expect(gcal.querySelector(".map-btn-label").textContent).toBe(
      "บันทึกปฏิทิน",
    );
    expect(gcal.classList.contains("is-done")).toBe(false);
  });

  it("copies the venue address and flashes a confirmation", async () => {
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    window.__weddingConfig = { venue_name: "ตำบลแป-ระ อำเภอท่าแพ" };
    initSmartCalendar({ ua: WINDOWS_UA, maxTouchPoints: 0 });

    const btn = document.getElementById("copy-address-btn");
    btn.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith("ตำบลแป-ระ อำเภอท่าแพ");
    expect(btn.querySelector(".map-btn-label").textContent).toBe(
      "คัดลอกแล้ว ✓",
    );
  });

  it("flashes a failure notice (without success styling) when copy is blocked", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
      configurable: true,
    });
    initSmartCalendar({ ua: WINDOWS_UA, maxTouchPoints: 0 });

    const btn = document.getElementById("copy-address-btn");
    btn.click();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(btn.querySelector(".map-btn-label").textContent).toBe(
      "คัดลอกไม่สำเร็จ",
    );
    expect(btn.classList.contains("is-done")).toBe(false);
  });
});
