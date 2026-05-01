import { burstConfetti } from './confetti.js';

const SHEET_URL = 'https://script.google.com/macros/s/AKfycbx3xzXnYpTqjmhY7MjYrgQ03c_9TvtNgYtiP_afh9VbOTDt6E_8As_u32FSX7yKAoQG/exec';

export function initRsvp() {
  const form = document.getElementById('rsvp-form');
  if (!form) return;
  const thankYou = document.getElementById('thank-you');
  const submitBtn = form.querySelector('button[type="submit"]');

  function showError(id, show) {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? 'block' : 'none';
  }
  function markError(el, hasError) {
    el.classList.toggle('error', hasError);
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const nameEl = document.getElementById('guest-name');
    const countEl = document.getElementById('guest-count');
    const attendVal = document.querySelector('input[name="attendance"]:checked');
    const noteEl = document.getElementById('guest-note');
    let valid = true;

    const nameOk = nameEl.value.trim().length >= 2;
    markError(nameEl, !nameOk); showError('err-name', !nameOk);
    if (!nameOk) valid = false;

    const countOk = countEl.value !== '';
    markError(countEl, !countOk); showError('err-count', !countOk);
    if (!countOk) valid = false;

    const attendOk = !!attendVal;
    showError('err-attend', !attendOk);
    if (!attendOk) valid = false;

    if (!valid) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'กำลังส่ง…';

    try {
      await fetch(SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ชื่อ: nameEl.value.trim(),
          จำนวน: countEl.value,
          การเข้าร่วม: attendVal.value,
          ข้อความ: noteEl?.value.trim() || ''
        })
      });
    } catch (_) {
      // no-cors always resolves — ignore network errors silently
    }

    form.style.display = 'none';
    if (thankYou) thankYou.style.display = 'flex';
    burstConfetti();
  });

  document.getElementById('guest-name')?.addEventListener('input', function () {
    if (this.value.trim().length >= 2) { markError(this, false); showError('err-name', false); }
  });
  document.getElementById('guest-count')?.addEventListener('change', function () {
    markError(this, false); showError('err-count', false);
  });
  document.querySelectorAll('input[name="attendance"]').forEach(r =>
    r.addEventListener('change', () => showError('err-attend', false))
  );
}
