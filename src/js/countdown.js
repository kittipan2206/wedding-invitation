export function initCountdown() {
  const wedding = new Date('2027-03-15T11:00:00+07:00');
  const pad = n => String(n).padStart(2, '0');
  const dEl = document.getElementById('cd-days');
  const hEl = document.getElementById('cd-hours');
  const mEl = document.getElementById('cd-mins');
  const sEl = document.getElementById('cd-secs');
  if (!dEl) return;

  function setVal(el, val) {
    const v = pad(val);
    if (el.textContent !== v) {
      el.style.transform = 'scale(1.12)';
      el.textContent = v;
      setTimeout(() => { el.style.transform = 'scale(1)'; }, 150);
    }
  }

  function tick() {
    const diff = wedding - new Date();
    if (diff <= 0) { [dEl, hEl, mEl, sEl].forEach(e => e.textContent = '00'); return; }
    setVal(dEl, Math.floor(diff / 86400000));
    setVal(hEl, Math.floor((diff % 86400000) / 3600000));
    setVal(mEl, Math.floor((diff % 3600000) / 60000));
    setVal(sEl, Math.floor((diff % 60000) / 1000));
  }
  tick();
  setInterval(tick, 1000);
}
