export function initCountdown() {
  const cfg = window.__weddingConfig;
  const isoDate = cfg?.event_date_iso || "2026-03-15";
  const time = cfg?.event_time_ceremony || "11:00";
  const wedding = new Date(`${isoDate}T${time}:00+07:00`);
  const pad = (n) => String(n).padStart(2, "0");

  const ids = ["cd-days", "cd-hours", "cd-mins", "cd-secs"];
  const els = ids.map((id) => document.getElementById(id));
  if (!els[0]) return;

  function showEndedState() {
    // Hide the grid of flip cards
    const grid = document.querySelector(".countdown-grid");
    const heading = document.querySelector(".countdown-heading");
    if (grid) grid.style.display = "none";
    if (heading) heading.style.display = "none";

    // Inject couple names then show ended message
    const ended = document.getElementById("countdown-ended");
    if (ended) {
      const groom = cfg?.groom_name || "นนท์";
      const bride = cfg?.bride_name || "เมย์";
      const namesEl = ended.querySelector(".countdown-ended-names");
      if (namesEl) namesEl.textContent = `${groom} & ${bride}`;
      ended.style.display = "flex";
    }
  }

  function setFlip(card, newVal) {
    const v = pad(newVal);
    const upperSpan = card.querySelector(".flip-card__upper span");
    if (upperSpan.textContent === v) return;

    const oldVal = upperSpan.textContent;
    const lowerSpan = card.querySelector(".flip-card__lower span");
    const flipTopSpan = card.querySelector(".flip-card__flip--top span");
    const flipBotSpan = card.querySelector(".flip-card__flip--bottom span");

    // Front of top flap = old value (flips away)
    flipTopSpan.textContent = oldVal;
    // Front of bottom flap = new value (comes in)
    flipBotSpan.textContent = v;
    // Update static upper immediately (hidden behind top flap during animation)
    upperSpan.textContent = v;

    // Reset then trigger animation
    card.classList.remove("flipping");
    void card.offsetWidth;
    card.classList.add("flipping");

    // After both halves finish (~580ms), update lower and clean up
    setTimeout(() => {
      lowerSpan.textContent = v;
      card.classList.remove("flipping");
    }, 620);
  }

  function tick() {
    const diff = wedding - new Date();
    if (diff <= 0) {
      clearInterval(timer);
      showEndedState();
      return;
    }
    const values = [
      Math.floor(diff / 86400000),
      Math.floor((diff % 86400000) / 3600000),
      Math.floor((diff % 3600000) / 60000),
      Math.floor((diff % 60000) / 1000),
    ];
    els.forEach((el, i) => setFlip(el, values[i]));
  }

  // Init static display without animation on first load
  const diff0 = wedding - new Date();
  if (diff0 <= 0) {
    // Already past ceremony time — show ended state immediately, no interval
    showEndedState();
    return;
  }
  const v0 = [
    Math.floor(diff0 / 86400000),
    Math.floor((diff0 % 86400000) / 3600000),
    Math.floor((diff0 % 3600000) / 60000),
    Math.floor((diff0 % 60000) / 1000),
  ];
  els.forEach((el, i) => {
    const s = pad(v0[i]);
    el.querySelectorAll("span").forEach((span) => (span.textContent = s));
  });

  const timer = setInterval(tick, 1000);
}
