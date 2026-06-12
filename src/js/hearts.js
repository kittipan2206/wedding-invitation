import { burstBloom } from "./bloom.js";

const SHEET_URL =
  "https://script.google.com/macros/s/AKfycbx3xzXnYpTqjmhY7MjYrgQ03c_9TvtNgYtiP_afh9VbOTDt6E_8As_u32FSX7yKAoQG/exec";

// "ส่งหัวใจ" button — every tap blooms petals from the button and counts a
// heart for the couple.
//
// IMPORTANT: the POST fires ONLY after GET ?type=hearts confirms the backend
// supports hearts. The GAS doPost treats any unrecognized POST as an RSVP
// (blank row + Telegram "RSVP ใหม่" ping), so an unguarded send is NOT a
// harmless no-op. Until the endpoint exists the button is visual-only.

const FLUSH_DELAY_MS = 900;

export function initHearts() {
  const btn = document.getElementById("send-heart-btn");
  if (!btn) return;
  const countEl = document.getElementById("heart-count");

  let heartsSupported = false;
  let pending = 0;
  let flushTimer = null;

  // Capability probe: backend must answer {count: N} to unlock sending
  fetch(`${SHEET_URL}?type=hearts`, { redirect: "follow" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data && typeof data.count === "number") {
        heartsSupported = true;
        if (countEl) {
          countEl.textContent = data.count;
          countEl.parentElement.style.display = "inline";
        }
      }
    })
    .catch(() => {});

  // Rapid taps batch into one POST ({type:"heart", count:N}) so an excited
  // guest doesn't fire dozens of requests at Apps Script
  function flush() {
    if (!pending) return;
    const count = pending;
    pending = 0;
    fetch(SHEET_URL, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "heart", count }),
    }).catch(() => {});
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      clearTimeout(flushTimer);
      flush();
    }
  });

  btn.addEventListener("click", () => {
    const rect = btn.getBoundingClientRect();
    burstBloom(rect.left + rect.width / 2, rect.top + rect.height / 2);

    btn.classList.remove("heart-pop");
    void btn.offsetWidth;
    btn.classList.add("heart-pop");

    if (!heartsSupported) return;

    if (countEl) {
      countEl.textContent = Number(countEl.textContent || 0) + 1;
    }
    pending++;
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
  });
}
