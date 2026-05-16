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
    const grid = document.querySelector(".countdown-grid");
    const heading = document.querySelector(".countdown-heading");
    if (grid) grid.style.display = "none";
    if (heading) heading.style.display = "none";

    const ended = document.getElementById("countdown-ended");
    if (ended) {
      const groom = cfg?.groom_name || "นนท์";
      const bride = cfg?.bride_name || "เมย์";
      const namesEl = ended.querySelector(".countdown-ended-names");
      if (namesEl) namesEl.textContent = `${groom} & ${bride}`;
      ended.style.display = "flex";
    }
  }

  function updateValue(el, newVal) {
    const v = pad(newVal);
    if (el.textContent === v) return;
    el.textContent = v;

    // Optional: add a subtle pop animation when number changes
    el.classList.remove("num-pop");
    void el.offsetWidth;
    el.classList.add("num-pop");
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
    els.forEach((el, i) => updateValue(el, values[i]));
  }

  const diff0 = wedding - new Date();
  if (diff0 <= 0) {
    showEndedState();
    return;
  }
  const v0 = [
    Math.floor(diff0 / 86400000),
    Math.floor((diff0 % 86400000) / 3600000),
    Math.floor((diff0 % 3600000) / 60000),
    Math.floor((diff0 % 60000) / 1000),
  ];
  els.forEach((el, i) => (el.textContent = pad(v0[i])));

  const timer = setInterval(tick, 1000);
}
