import { burstBloom } from "./bloom.js";

const SHEET_URL =
  "https://script.google.com/macros/s/AKfycbx3xzXnYpTqjmhY7MjYrgQ03c_9TvtNgYtiP_afh9VbOTDt6E_8As_u32FSX7yKAoQG/exec";

// "ส่งหัวใจ" button — every tap blooms petals from the button and counts a
// heart for the couple. The global counter renders only if the Apps Script
// backend supports ?type=hearts (returns {count: N}); otherwise the button
// still works visually and sends are fire-and-forget.

let localCount = 0;

export function initHearts() {
  const btn = document.getElementById("send-heart-btn");
  if (!btn) return;
  const countEl = document.getElementById("heart-count");

  // Show the global count only when the backend actually supports it
  fetch(`${SHEET_URL}?type=hearts`, { redirect: "follow" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      const n = data && typeof data.count === "number" ? data.count : null;
      if (n !== null && countEl) {
        countEl.textContent = n;
        countEl.parentElement.style.display = "inline";
      }
    })
    .catch(() => {});

  btn.addEventListener("click", () => {
    localCount++;
    const rect = btn.getBoundingClientRect();
    burstBloom(rect.left + rect.width / 2, rect.top + rect.height / 2);

    btn.classList.remove("heart-pop");
    void btn.offsetWidth;
    btn.classList.add("heart-pop");

    if (countEl && countEl.parentElement.style.display !== "none") {
      countEl.textContent = Number(countEl.textContent || 0) + 1;
    }

    // Fire-and-forget — harmless no-op until the GAS endpoint exists
    try {
      fetch(SHEET_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "heart" }),
      }).catch(() => {});
    } catch {
      // network unavailable — the bloom already played, that's what matters
    }
  });
}
