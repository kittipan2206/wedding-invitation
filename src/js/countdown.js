// Countdown with three states relative to the wedding day (Asia/Bangkok):
//  - before the day  → ticking countdown, heading "อีก N วัน เราจะได้เจอกัน"
//  - on the day      → "วันนี้แล้ว!" + ceremony time + navigate button
//  - after the day   → thank-you message (memory mode handles the rest)

export function getCountdownPhase(isoDate, now = new Date()) {
  const dayStart = new Date(`${isoDate}T00:00:00+07:00`);
  const dayEnd = new Date(`${isoDate}T23:59:59+07:00`);
  if (now > dayEnd) return "ended";
  if (now >= dayStart) return "day-of";
  return "counting";
}

export function headingCopy(days) {
  if (days >= 1) return `อีก ${days} วัน เราจะได้เจอกัน`;
  return "อีกไม่กี่ชั่วโมงแล้ว!";
}

export function initCountdown() {
  const cfg = window.__weddingConfig;
  const isoDate = cfg?.event_date_iso || "2026-03-15";
  const time = cfg?.event_time_ceremony || "11:00";
  const wedding = new Date(`${isoDate}T${time}:00+07:00`);
  const pad = (n) => String(n).padStart(2, "0");

  const ids = ["cd-days", "cd-hours", "cd-mins", "cd-secs"];
  const els = ids.map((id) => document.getElementById(id));
  if (!els[0]) return;

  const heading = document.querySelector(".countdown-heading");

  function showEndedState() {
    const grid = document.querySelector(".countdown-grid");
    if (grid) grid.style.display = "none";
    if (heading) heading.style.display = "none";

    // "นับถอยหลังสู่วันพิเศษ" no longer makes sense once the day has passed
    const label = document.querySelector("#countdown .section-label");
    if (label) label.textContent = "ขอบคุณจากใจ";

    const ended = document.getElementById("countdown-ended");
    if (ended) {
      const groom = cfg?.groom_name || "นนท์";
      const bride = cfg?.bride_name || "เมย์";
      const namesEl = ended.querySelector(".countdown-ended-names");
      if (namesEl) namesEl.textContent = `${groom} & ${bride}`;
      ended.style.display = "flex";
    }
  }

  function showDayOfState() {
    const grid = document.querySelector(".countdown-grid");
    if (grid) grid.style.display = "none";
    if (heading) heading.style.display = "none";

    const label = document.querySelector("#countdown .section-label");
    if (label) label.textContent = "วันที่รอคอยมาถึงแล้ว";

    const dayof = document.getElementById("countdown-dayof");
    if (dayof) {
      const timeEl = document.getElementById("dayof-time");
      if (timeEl)
        timeEl.textContent = `แล้วพบกันเวลา ${cfg?.event_time_ceremony || time} น. นะ`;
      const navBtn = document.getElementById("dayof-navigate-btn");
      if (navBtn && cfg?.venue_maps_url) navBtn.href = cfg.venue_maps_url;
      dayof.style.display = "flex";
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

  function render(diff) {
    const values = [
      Math.floor(diff / 86400000),
      Math.floor((diff % 86400000) / 3600000),
      Math.floor((diff % 3600000) / 60000),
      Math.floor((diff % 60000) / 1000),
    ];
    els.forEach((el, i) => updateValue(el, values[i]));
    if (heading) {
      const copy = headingCopy(values[0]);
      if (heading.textContent !== copy) heading.textContent = copy;
    }
  }

  function tick() {
    if (getCountdownPhase(isoDate) === "day-of") {
      clearInterval(timer);
      showDayOfState();
      return;
    }
    const diff = wedding - new Date();
    if (diff <= 0) {
      clearInterval(timer);
      showEndedState();
      return;
    }
    render(diff);
  }

  const phase = getCountdownPhase(isoDate);
  if (phase === "ended") {
    showEndedState();
    return;
  }
  if (phase === "day-of") {
    showDayOfState();
    return;
  }

  render(wedding - new Date());
  const timer = setInterval(tick, 1000);
}
