import { describe, it, expect, beforeEach, vi } from "vitest";
import { initRsvp } from "../../src/js/rsvp.js";

// Mock burstConfetti (imported inside rsvp.js)
vi.mock("../../src/js/confetti.js", () => ({ burstConfetti: vi.fn() }));

function setupRsvpDOM({ deadlineIso = "2099-12-31" } = {}) {
  window.__weddingConfig = {
    rsvp_deadline_iso: deadlineIso,
    rsvp_deadline_display: "31 ธันวาคม 2642",
  };

  document.body.innerHTML = `
    <div id="rsvp">
      <div id="rsvp-closed-banner" style="display:none">
        หมดเขต: <span id="rsvp-closed-date"></span>
      </div>
      <form id="rsvp-form">
        <input id="guest-name" type="text" />
        <span id="err-name" style="display:none">กรุณากรอกชื่อ</span>

        <select id="guest-count">
          <option value="">เลือก...</option>
          <option value="1">1</option>
          <option value="2">2</option>
        </select>
        <span id="err-count" style="display:none">กรุณาเลือกจำนวน</span>

        <label><input type="radio" name="attendance" id="attend-yes" value="ยินดีเข้าร่วม" /> มา</label>
        <label><input type="radio" name="attendance" id="attend-no"  value="ไม่สะดวกเข้าร่วม" /> ไม่มา</label>
        <span id="err-attend" style="display:none">กรุณาเลือก</span>

        <input id="guest-contact" type="text" />
        <textarea id="guest-note" maxlength="300"></textarea>
        <span id="rsvp-char-counter">0 / 300 ตัวอักษร</span>

        <button type="submit">ส่ง RSVP</button>
      </form>
      <div id="thank-you" style="display:none">ขอบคุณ!</div>
    </div>`;
}

// ─── Validation — name ────────────────────────────────────────────────────────

describe("RSVP validation — name", () => {
  beforeEach(() => {
    setupRsvpDOM();
    initRsvp();
  });

  it("shows err-name when name is empty on submit", async () => {
    document.getElementById("guest-count").value = "1";
    document.getElementById("attend-yes").checked = true;
    document.querySelector("#rsvp-form button[type='submit']").click();
    await Promise.resolve();
    expect(document.getElementById("err-name").style.display).toBe("block");
  });

  it("shows err-name when name has fewer than 2 characters", async () => {
    document.getElementById("guest-name").value = "ก";
    document.getElementById("guest-count").value = "1";
    document.getElementById("attend-yes").checked = true;
    document.querySelector("#rsvp-form button[type='submit']").click();
    await Promise.resolve();
    expect(document.getElementById("err-name").style.display).toBe("block");
  });

  it("does not show err-name when name has 2+ characters", async () => {
    document.getElementById("guest-name").value = "สมชาย";
    document.getElementById("guest-count").value = "1";
    document.getElementById("attend-yes").checked = true;
    document.querySelector("#rsvp-form button[type='submit']").click();
    await Promise.resolve();
    expect(document.getElementById("err-name").style.display).toBe("none");
  });
});

// ─── Validation — attendance ─────────────────────────────────────────────────

describe("RSVP validation — attendance", () => {
  beforeEach(() => {
    setupRsvpDOM();
    initRsvp();
  });

  it("shows err-attend when no radio is selected", async () => {
    document.getElementById("guest-name").value = "สมชาย";
    document.getElementById("guest-count").value = "1";
    document.querySelector("#rsvp-form button[type='submit']").click();
    await Promise.resolve();
    expect(document.getElementById("err-attend").style.display).toBe("block");
  });

  it("does not show err-attend when a radio is selected", async () => {
    document.getElementById("guest-name").value = "สมชาย";
    document.getElementById("guest-count").value = "1";
    document.getElementById("attend-yes").checked = true;
    document.querySelector("#rsvp-form button[type='submit']").click();
    await Promise.resolve();
    expect(document.getElementById("err-attend").style.display).toBe("none");
  });
});

// ─── Char counter ────────────────────────────────────────────────────────────

describe("RSVP — character counter", () => {
  beforeEach(() => {
    setupRsvpDOM();
    initRsvp();
  });

  it("counter updates as user types in note field", () => {
    const note = document.getElementById("guest-note");
    const counter = document.getElementById("rsvp-char-counter");
    note.value = "สวัสดี";
    note.dispatchEvent(new Event("input"));
    expect(counter.textContent).toContain("6");
  });

  it("counter starts at 0", () => {
    expect(document.getElementById("rsvp-char-counter").textContent).toContain("0");
  });
});

// ─── Deadline ────────────────────────────────────────────────────────────────

describe("RSVP — deadline", () => {
  it("shows closed banner when deadline has passed", () => {
    setupRsvpDOM({ deadlineIso: "2020-01-01" });
    initRsvp();
    expect(document.getElementById("rsvp-closed-banner").style.display).not.toBe("none");
  });

  it("disables all form fields after deadline", () => {
    setupRsvpDOM({ deadlineIso: "2020-01-01" });
    initRsvp();
    const inputs = document.querySelectorAll("#rsvp-form input, #rsvp-form select, #rsvp-form textarea, #rsvp-form button");
    inputs.forEach((el) => expect(el.disabled).toBe(true));
  });

  it("does not show closed banner when deadline is in the future", () => {
    setupRsvpDOM({ deadlineIso: "2099-12-31" });
    initRsvp();
    expect(document.getElementById("rsvp-closed-banner").style.display).toBe("none");
  });
});

// ─── Already submitted ────────────────────────────────────────────────────────

describe("RSVP — localStorage persistence", () => {
  it("shows thank-you immediately when already submitted", () => {
    localStorage.setItem("rsvp_submitted_v1", JSON.stringify({ name: "สมชาย", ts: Date.now() }));
    setupRsvpDOM();
    initRsvp();
    expect(document.getElementById("thank-you").style.display).toBe("flex");
    expect(document.getElementById("rsvp-form").style.display).toBe("none");
  });

  it("shows form when not yet submitted", () => {
    setupRsvpDOM();
    initRsvp();
    // Form should not be hidden (display is "" or "block")
    expect(document.getElementById("rsvp-form").style.display).not.toBe("none");
    expect(document.getElementById("thank-you").style.display).toBe("none");
  });
});
