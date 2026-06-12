import { describe, it, expect, beforeEach, vi } from "vitest";
import { initCountdown } from "../../src/js/countdown.js";

const COUNTDOWN_UNIT_HTML = (id) => `
  <div class="countdown-unit">
    <div class="countdown-number" id="${id}">00</div>
  </div>`;

function setupCountdownDOM() {
  document.body.innerHTML = `
    <div class="countdown-heading">นับถอยหลัง</div>
    <div class="countdown-grid">
      ${COUNTDOWN_UNIT_HTML("cd-days")}
      ${COUNTDOWN_UNIT_HTML("cd-hours")}
      ${COUNTDOWN_UNIT_HTML("cd-mins")}
      ${COUNTDOWN_UNIT_HTML("cd-secs")}
    </div>
    <div id="countdown-ended" style="display:none">
      <span class="countdown-ended-names"></span>
    </div>`;
}

describe("initCountdown — past event", () => {
  beforeEach(() => {
    setupCountdownDOM();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows ended state immediately when event date has passed", () => {
    window.__weddingConfig = {
      event_date_iso: "2020-01-01",
      event_time_ceremony: "10:00",
    };
    initCountdown();
    expect(document.getElementById("countdown-ended").style.display).toBe("flex");
  });

  it("hides the countdown grid when event has passed", () => {
    window.__weddingConfig = {
      event_date_iso: "2020-01-01",
      event_time_ceremony: "10:00",
    };
    initCountdown();
    expect(document.querySelector(".countdown-grid").style.display).toBe("none");
  });

  it("shows couple names in the ended message", () => {
    window.__weddingConfig = {
      event_date_iso: "2020-01-01",
      event_time_ceremony: "10:00",
      groom_name: "นนท์",
      bride_name: "เมย์",
    };
    initCountdown();
    const text = document.querySelector(".countdown-ended-names").textContent;
    expect(text).toContain("นนท์");
    expect(text).toContain("เมย์");
  });

  it("falls back to default names when config has no names", () => {
    window.__weddingConfig = { event_date_iso: "2020-01-01", event_time_ceremony: "10:00" };
    initCountdown();
    const text = document.querySelector(".countdown-ended-names").textContent;
    expect(text).toContain("นนท์");
    expect(text).toContain("เมย์");
  });
});

describe("initCountdown — future event", () => {
  beforeEach(() => {
    setupCountdownDOM();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does NOT show ended state when event is in the future", () => {
    window.__weddingConfig = {
      event_date_iso: "2099-01-01",
      event_time_ceremony: "10:00",
    };
    initCountdown();
    expect(document.getElementById("countdown-ended").style.display).toBe("none");
  });

  it("populates countdown numbers with non-zero values for a far-future date", () => {
    window.__weddingConfig = {
      event_date_iso: "2099-01-01",
      event_time_ceremony: "10:00",
    };
    initCountdown();
    const days = document.getElementById("cd-days").textContent;
    expect(Number(days)).toBeGreaterThan(0);
  });

  it("does nothing when countdown elements are missing from DOM", () => {
    document.body.innerHTML = ""; // no countdown units
    window.__weddingConfig = { event_date_iso: "2099-01-01", event_time_ceremony: "10:00" };
    expect(() => initCountdown()).not.toThrow();
  });
});

describe("initCountdown — uses defaults when no config", () => {
  beforeEach(() => {
    setupCountdownDOM();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs without error when window.__weddingConfig is undefined", () => {
    window.__weddingConfig = undefined;
    expect(() => initCountdown()).not.toThrow();
  });
});
