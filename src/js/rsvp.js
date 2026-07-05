// (confetti retired — the mail-away envelope in rsvp-send-anim.js is the
// celebratory moment now, and it's on-theme)
import { playRsvpSendAnimation } from "./rsvp-send-anim.js";
import { downloadIcs } from "./ics.js";

const SHEET_URL =
  "https://script.google.com/macros/s/AKfycbx3xzXnYpTqjmhY7MjYrgQ03c_9TvtNgYtiP_afh9VbOTDt6E_8As_u32FSX7yKAoQG/exec";
const STORAGE_KEY = "rsvp_submitted_v1";

// Personalized thank-you: greet the guest by name; attendees also get the
// event date and both add-to-calendar buttons right where the decision
// just happened (the best moment for that nudge).
export function fillThankYou({ name, attending }, cfg) {
  const heading = document.getElementById("ty-heading");
  const msg = document.getElementById("ty-msg");
  const cal = document.getElementById("ty-calendar");
  const trimmed = (name || "").trim();
  const displayName =
    trimmed && (/^คุณ/.test(trimmed) ? trimmed : `คุณ${trimmed}`);

  if (attending) {
    if (heading && displayName) heading.textContent = `ขอบคุณ ${displayName} ♡`;
    if (msg)
      msg.textContent = cfg?.event_date_display
        ? `ได้รับคำยืนยันเรียบร้อยแล้ว แล้วพบกันวันที่ ${cfg.event_date_display} นะ ♡`
        : "ได้รับคำยืนยันเรียบร้อยแล้ว ดีใจมากที่จะได้พบกันในวันพิเศษนี้ ♡";
    if (cal) cal.style.display = "block";
  } else {
    if (heading)
      heading.textContent = displayName
        ? `ขอบคุณที่แจ้งให้ทราบนะ ${displayName}`
        : "ขอบคุณที่แจ้งให้ทราบนะ ♡";
    if (msg)
      msg.textContent =
        "เสียดายที่ไม่ได้เจอกันในวันงาน ขอบคุณจากใจที่ตอบกลับมา ไว้เจอกันโอกาสหน้านะ ♡";
    if (cal) cal.style.display = "none";
  }
}

export function initRsvp() {
  const form = document.getElementById("rsvp-form");
  if (!form) return;
  const thankYou = document.getElementById("thank-you");
  const submitBtn = form.querySelector('button[type="submit"]');

  // iPhone calendar button inside the thank-you card
  document.getElementById("ty-ics-btn")?.addEventListener("click", downloadIcs);

  // Already submitted — show the personalized thank-you immediately
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    let saved = {};
    try {
      saved = JSON.parse(stored) || {};
    } catch {}
    // Older saves had no `attending` flag — assume attending
    fillThankYou(
      { name: saved.name, attending: saved.attending !== false },
      window.__weddingConfig,
    );
    form.style.display = "none";
    if (thankYou) thankYou.style.display = "flex";
    return;
  }

  // Deadline check — hide the form entirely when past rsvp_deadline_iso.
  // A grayed-out form reads as "broken"; a clear closed card + direct-contact
  // hint tells late guests what to do instead.
  const deadlineIso = window.__weddingConfig?.rsvp_deadline_iso;
  if (deadlineIso) {
    const deadline = new Date(`${deadlineIso}T23:59:59+07:00`);
    if (new Date() > deadline) {
      const banner = document.getElementById("rsvp-closed-banner");
      const closedDate = document.getElementById("rsvp-closed-date");
      if (banner) banner.style.display = "flex";
      if (closedDate) {
        const display =
          window.__weddingConfig?.rsvp_deadline_display || deadlineIso;
        closedDate.textContent = `หมดเขตวันที่ ${display}`;
      }
      const deadlineText = document.getElementById("rsvp-deadline-text");
      if (deadlineText) deadlineText.style.display = "none";
      const formCard = form.closest(".rsvp-form") || form;
      formCard.style.display = "none";
      return;
    }
  }

  function showError(id, show) {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? "block" : "none";
  }
  function markError(el, hasError) {
    el.classList.toggle("error", hasError);
  }
  function validateName(el) {
    const ok = el.value.trim().length >= 2;
    markError(el, !ok);
    showError("err-name", !ok);
    return ok;
  }
  function validateCount(el) {
    const ok = el.value !== "";
    markError(el, !ok);
    showError("err-count", !ok);
    return ok;
  }
  function validateAttend() {
    const ok = !!document.querySelector('input[name="attendance"]:checked');
    showError("err-attend", !ok);
    return ok;
  }

  // onBlur validation
  document.getElementById("guest-name")?.addEventListener("blur", function () {
    validateName(this);
  });
  document.getElementById("guest-count")?.addEventListener("blur", function () {
    validateCount(this);
  });

  // Clear errors on input/change
  document.getElementById("guest-name")?.addEventListener("input", function () {
    if (this.value.trim().length >= 2) {
      markError(this, false);
      showError("err-name", false);
    }
  });
  document
    .getElementById("guest-count")
    ?.addEventListener("change", function () {
      markError(this, false);
      showError("err-count", false);
    });
  document
    .querySelectorAll('input[name="attendance"]')
    .forEach((r) =>
      r.addEventListener("change", () => showError("err-attend", false)),
    );

  // Char counter
  const noteEl = document.getElementById("guest-note");
  const counter = document.getElementById("rsvp-char-counter");
  if (noteEl && counter) {
    noteEl.addEventListener("input", () => {
      counter.textContent = `${noteEl.value.length} / 300 ตัวอักษร`;
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nameEl = document.getElementById("guest-name");
    const countEl = document.getElementById("guest-count");
    const contactEl = document.getElementById("guest-contact");

    const nameOk = validateName(nameEl);
    const countOk = validateCount(countEl);
    const attendOk = validateAttend();

    if (!nameOk || !countOk || !attendOk) {
      // Focus first error
      if (!nameOk) nameEl.focus();
      else if (!countOk) countEl.focus();
      return;
    }

    const attendVal = document.querySelector(
      'input[name="attendance"]:checked',
    );

    submitBtn.disabled = true;
    submitBtn.textContent = "กำลังส่ง…";

    const payload = {
      ชื่อ: nameEl.value.trim(),
      จำนวน: countEl.value,
      การเข้าร่วม: attendVal.value,
      ติดต่อ: contactEl?.value.trim() || "",
      ข้อความ: noteEl?.value.trim() || "",
    };

    try {
      await fetch(SHEET_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (_) {}

    const name = nameEl.value.trim();
    const attending = attendVal.value === "ยินดีเข้าร่วม";

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ name, attending, ts: Date.now() }),
    );

    // The reply is "mailed": paper folds into an envelope, gets sealed,
    // and flies off — then the personalized thank-you takes its place
    playRsvpSendAnimation(() => {
      fillThankYou({ name, attending }, window.__weddingConfig);
      form.style.display = "none";
      if (thankYou) thankYou.style.display = "flex";
    });
  });
}
