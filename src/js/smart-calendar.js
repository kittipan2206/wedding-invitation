// Platform-aware calendar & map actions.
//
// Each calendar cluster (details section + RSVP thank-you nudge) keeps both
// options in the DOM, but only the one matching the guest's platform stays a
// big button — the other demotes to a small text link in the alt row below.
// Apple devices default to the .ics flow, everyone else to Google Calendar.
// Also wires the Apple Maps link (Apple only), the copy-address link, and a
// "done ✓" flash + haptic tick on the calendar controls.
import { CONFIG_DEFAULTS } from "./config.js";
import { isApple } from "./platform.js";

const DONE_LABEL = "เปิดปฏิทินให้แล้ว ✓";
const COPIED_LABEL = "คัดลอกแล้ว ✓";
const COPY_FAILED_LABEL = "คัดลอกไม่สำเร็จ";
const FLASH_MS = 2400;

function currentVenue() {
  return window.__weddingConfig?.venue_name || CONFIG_DEFAULTS.venue_name;
}

function labelEl(el) {
  return el?.querySelector(".map-btn-label");
}

function setLabel(el, text) {
  const span = labelEl(el);
  if (span) span.textContent = text;
}

// Temporarily swap a control's label for a confirmation, with a haptic tick.
// done=false flashes the text without the green success style.
function flashLabel(el, text, done = true) {
  const span = labelEl(el);
  if (!span || el.dataset.flashing) return;
  el.dataset.flashing = "1";
  const original = span.textContent;
  span.textContent = text;
  if (done) el.classList.add("is-done");
  if (navigator.vibrate) navigator.vibrate(10);
  setTimeout(() => {
    span.textContent = original;
    el.classList.remove("is-done");
    delete el.dataset.flashing;
  }, FLASH_MS);
}

// Turn a big calendar button into a small text link and move it to the alt
// row. The node itself moves, so existing click listeners stay attached.
function demoteToAltLink(el, label, altRow) {
  if (!el) return;
  el.classList.remove("map-btn", "map-btn--calendar", "ty-cal-btn");
  el.classList.add("cal-alt-link");
  setLabel(el, label);
  if (altRow) altRow.prepend(el);
}

function wireDoneFlash(ids) {
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", () => flashLabel(el, DONE_LABEL));
  });
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // In-app browsers may block the async clipboard API — legacy fallback
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export function initSmartCalendar({
  ua = navigator.userAgent,
  maxTouchPoints = navigator.maxTouchPoints ?? 0,
} = {}) {
  const apple = isApple(ua, maxTouchPoints);

  // ── Details section: promote the platform's calendar option ──
  const gcalBtn = document.getElementById("calendar-btn");
  const icsBtn = document.getElementById("calendar-ics-btn");
  const altRow = document.getElementById("map-actions-alt");
  if (apple) {
    setLabel(icsBtn, "บันทึกปฏิทิน");
    demoteToAltLink(gcalBtn, "หรือใช้ Google Calendar", altRow);
  } else {
    demoteToAltLink(icsBtn, "หรือโหลดไฟล์ .ics (Apple Calendar)", altRow);
  }

  // ── RSVP thank-you nudge: same pairing, smaller stage ──
  const tyGcal = document.getElementById("ty-gcal-btn");
  const tyIcs = document.getElementById("ty-ics-btn");
  const tyAltRow = document.getElementById("ty-cal-alt");
  if (apple) {
    setLabel(tyIcs, "เพิ่มลงปฏิทิน");
    demoteToAltLink(tyGcal, "หรือใช้ Google Calendar", tyAltRow);
  } else {
    demoteToAltLink(tyIcs, "หรือโหลดไฟล์ .ics", tyAltRow);
  }

  wireDoneFlash([
    "calendar-btn",
    "calendar-ics-btn",
    "ty-gcal-btn",
    "ty-ics-btn",
  ]);

  // ── Apple Maps link — only meaningful on Apple devices ──
  const appleMaps = document.getElementById("map-apple-link");
  if (appleMaps && apple) {
    appleMaps.hidden = false;
    // Refresh href on every click — venue may change via SWR re-inject
    const setHref = () => {
      appleMaps.href = `https://maps.apple.com/?q=${encodeURIComponent(currentVenue())}`;
    };
    setHref();
    appleMaps.addEventListener("click", setHref);
  }

  // ── Copy venue address ──
  const copyBtn = document.getElementById("copy-address-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const ok = await copyText(currentVenue());
      // Always answer the tap — a silent failure reads as a broken button
      flashLabel(copyBtn, ok ? COPIED_LABEL : COPY_FAILED_LABEL, ok);
    });
  }
}
