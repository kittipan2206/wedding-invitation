import { describe, it, expect, beforeEach } from "vitest";
import { isPostEvent, applyMemoryMode } from "../../src/js/memory-mode.js";

// ─── isPostEvent ─────────────────────────────────────────────────────────────

describe("isPostEvent", () => {
  it("is false before the wedding day", () => {
    const cfg = { event_date_iso: "2026-08-01" };
    expect(isPostEvent(cfg, new Date("2026-07-31T12:00:00+07:00"))).toBe(false);
  });

  it("is false during the wedding day itself", () => {
    const cfg = { event_date_iso: "2026-08-01" };
    expect(isPostEvent(cfg, new Date("2026-08-01T18:00:00+07:00"))).toBe(false);
  });

  it("is true the day after the wedding (Asia/Bangkok)", () => {
    const cfg = { event_date_iso: "2026-08-01" };
    expect(isPostEvent(cfg, new Date("2026-08-02T00:01:00+07:00"))).toBe(true);
  });

  it("is false when event_date_iso is missing or malformed", () => {
    expect(isPostEvent({}, new Date())).toBe(false);
    expect(isPostEvent({ event_date_iso: "soon" }, new Date())).toBe(false);
    expect(isPostEvent(null, new Date())).toBe(false);
  });
});

// ─── applyMemoryMode ─────────────────────────────────────────────────────────

describe("applyMemoryMode", () => {
  beforeEach(() => {
    document.body.className = "";
    document.body.innerHTML = `
      <p class="hero-badge"><span class="hero-badge-line"></span>Wedding Invitation<span class="hero-badge-line"></span></p>
      <section id="countdown"></section>
      <section id="details">
        <div class="map-actions"></div>
        <div class="travel-info"></div>
      </section>
      <section id="rsvp"></section>
      <section id="gallery"></section>
    `;
  });

  const pastCfg = {
    event_date_iso: "2020-01-01",
    groom_name: "นนท์",
    bride_name: "เมย์",
  };

  it("does nothing before the event", () => {
    const applied = applyMemoryMode({ event_date_iso: "2099-01-01" });
    expect(applied).toBe(false);
    expect(document.body.classList.contains("post-event")).toBe(false);
    expect(document.getElementById("rsvp").style.display).not.toBe("none");
  });

  it("adds post-event class and hides invite-only UI after the event", () => {
    const applied = applyMemoryMode(pastCfg);
    expect(applied).toBe(true);
    expect(document.body.classList.contains("post-event")).toBe(true);
    expect(document.getElementById("rsvp").style.display).toBe("none");
    expect(document.querySelector(".map-actions").style.display).toBe("none");
    expect(document.querySelector(".travel-info").style.display).toBe("none");
  });

  it("rewrites the hero badge to memory wording", () => {
    applyMemoryMode(pastCfg);
    expect(document.querySelector(".hero-badge").textContent).toContain(
      "Our Wedding Memory",
    );
  });

  it("moves the gallery right after the countdown", () => {
    applyMemoryMode(pastCfg);
    const countdown = document.getElementById("countdown");
    expect(countdown.nextElementSibling.id).toBe("gallery");
  });

  it("sets a thank-you page title", () => {
    applyMemoryMode(pastCfg);
    expect(document.title).toContain("ขอบคุณ");
  });
});
