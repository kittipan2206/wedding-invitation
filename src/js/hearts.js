import { burstBloom } from "./bloom.js";

const SHEET_URL =
  "https://script.google.com/macros/s/AKfycbx3xzXnYpTqjmhY7MjYrgQ03c_9TvtNgYtiP_afh9VbOTDt6E_8As_u32FSX7yKAoQG/exec";

const FLUSH_DELAY_MS = 900;
const MILESTONES = [10, 25, 50, 100, 200];
const FLOAT_CHARS = ["❤️", "🩷", "💗", "💖", "💝", "🌸"];
const STORED_KEY = "hearts_sent_v1";

// IMPORTANT: the POST fires ONLY after GET ?type=hearts confirms the backend
// supports hearts. The GAS doPost treats any unrecognized POST as an RSVP
// (blank row + Telegram ping), so an unguarded send is NOT a harmless no-op.
export function initHearts() {
  const btn = document.getElementById("send-heart-btn");
  if (!btn) return;

  const countEl = document.getElementById("heart-count");
  const countWrap = document.querySelector(".heart-count-wrap");
  const feedbackEl = document.getElementById("heart-feedback");

  let heartsSupported = false;
  let pending = 0;
  let flushTimer = null;

  // Restore filled state from previous visit
  if (localStorage.getItem(STORED_KEY) === "1") {
    btn.classList.add("heart-filled");
  }

  // Capability probe — backend must answer {count: N} to unlock sending
  fetch(`${SHEET_URL}?type=hearts`, { redirect: "follow" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data && typeof data.count === "number") {
        heartsSupported = true;
        if (countEl) countEl.textContent = data.count;
        if (countWrap) countWrap.style.display = "inline";
      }
    })
    .catch(() => {});

  // Rapid taps batch into one POST so an excited guest doesn't spam GAS
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

  // Floating heart emoji — fixed position, appended to body so nothing clips it
  function spawnFloat() {
    const bRect = btn.getBoundingClientRect();
    const cx = bRect.left + bRect.width / 2;
    const cy = bRect.top + bRect.height / 2;

    const el = document.createElement("span");
    el.className = "heart-float";
    el.setAttribute("aria-hidden", "true");
    el.textContent =
      FLOAT_CHARS[Math.floor(Math.random() * FLOAT_CHARS.length)];

    const size = 16 + Math.random() * 12;
    const driftX = (Math.random() - 0.5) * 80;
    const riseY = 90 + Math.random() * 80;
    const dur = 1.2 + Math.random() * 0.6;

    el.style.cssText = `
      left:${cx - size / 2}px;
      top:${cy - size / 2}px;
      font-size:${size}px;
      animation-duration:${dur}s;
      --hf-dx:${driftX}px;
      --hf-dy:${-riseY}px;
    `;
    document.body.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }

  function flashFeedback() {
    if (!feedbackEl) return;
    feedbackEl.classList.remove("heart-feedback--on");
    void feedbackEl.offsetWidth;
    feedbackEl.classList.add("heart-feedback--on");
  }

  function triggerMilestone(n) {
    // Double burst — full screen + from button
    burstBloom(window.innerWidth / 2, window.innerHeight / 2);
    const r = btn.getBoundingClientRect();
    setTimeout(
      () => burstBloom(r.left + r.width / 2, r.top + r.height / 2),
      180,
    );
    showMilestoneToast(`${n} หัวใจแล้ว! 💕`);
  }

  function showMilestoneToast(msg) {
    let toast = document.getElementById("heart-milestone-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "heart-milestone-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.remove("hmt--show");
    void toast.offsetWidth;
    toast.classList.add("hmt--show");
  }

  btn.addEventListener("click", () => {
    // Spring pop on button
    btn.classList.remove("heart-pop");
    void btn.offsetWidth;
    btn.classList.add("heart-pop");

    // Haptic pulse (Android)
    if (navigator.vibrate) navigator.vibrate([8, 20, 8]);

    // Persist filled state across reloads
    if (!btn.classList.contains("heart-filled")) {
      btn.classList.add("heart-filled");
      localStorage.setItem(STORED_KEY, "1");
    }

    // Floating hearts — 2 usually, 3 occasionally for variety
    const bursts = Math.random() < 0.35 ? 3 : 2;
    for (let i = 0; i < bursts; i++) setTimeout(spawnFloat, i * 90);

    // Bloom burst from button centre
    const rect = btn.getBoundingClientRect();
    burstBloom(rect.left + rect.width / 2, rect.top + rect.height / 2);

    // "ส่งแล้ว! ♡" flash label
    flashFeedback();

    if (!heartsSupported) return;

    // Bump counter
    const next = Number(countEl?.textContent || 0) + 1;
    if (countEl) {
      countEl.textContent = next;
      countEl.classList.remove("heart-count-bump");
      void countEl.offsetWidth;
      countEl.classList.add("heart-count-bump");
    }

    if (MILESTONES.includes(next)) triggerMilestone(next);

    pending++;
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
  });
}
