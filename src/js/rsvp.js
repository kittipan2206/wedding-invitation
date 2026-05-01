import { burstConfetti } from './confetti.js';

const SHEET_URL = 'https://script.google.com/macros/s/AKfycbx3xzXnYpTqjmhY7MjYrgQ03c_9TvtNgYtiP_afh9VbOTDt6E_8As_u32FSX7yKAoQG/exec';
const STORAGE_KEY = 'rsvp_submitted_v1';

export function initRsvp() {
  const form = document.getElementById('rsvp-form');
  if (!form) return;
  const thankYou = document.getElementById('thank-you');
  const submitBtn = form.querySelector('button[type="submit"]');

  // Already submitted — show thank-you immediately
  if (localStorage.getItem(STORAGE_KEY)) {
    form.style.display = 'none';
    if (thankYou) thankYou.style.display = 'flex';
    return;
  }

  function showError(id, show) {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? 'block' : 'none';
  }
  function markError(el, hasError) {
    el.classList.toggle('error', hasError);
  }
  function validateName(el) {
    const ok = el.value.trim().length >= 2;
    markError(el, !ok); showError('err-name', !ok);
    return ok;
  }
  function validateCount(el) {
    const ok = el.value !== '';
    markError(el, !ok); showError('err-count', !ok);
    return ok;
  }
  function validateAttend() {
    const ok = !!document.querySelector('input[name="attendance"]:checked');
    showError('err-attend', !ok);
    return ok;
  }

  // onBlur validation
  document.getElementById('guest-name')?.addEventListener('blur', function () { validateName(this); });
  document.getElementById('guest-count')?.addEventListener('blur', function () { validateCount(this); });

  // Clear errors on input/change
  document.getElementById('guest-name')?.addEventListener('input', function () {
    if (this.value.trim().length >= 2) { markError(this, false); showError('err-name', false); }
  });
  document.getElementById('guest-count')?.addEventListener('change', function () {
    markError(this, false); showError('err-count', false);
  });
  document.querySelectorAll('input[name="attendance"]').forEach(r =>
    r.addEventListener('change', () => showError('err-attend', false))
  );

  // Char counter
  const noteEl = document.getElementById('guest-note');
  const counter = document.getElementById('rsvp-char-counter');
  if (noteEl && counter) {
    noteEl.addEventListener('input', () => {
      counter.textContent = `${noteEl.value.length} / 300 ตัวอักษร`;
    });
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const nameEl    = document.getElementById('guest-name');
    const countEl   = document.getElementById('guest-count');
    const contactEl = document.getElementById('guest-contact');

    const nameOk   = validateName(nameEl);
    const countOk  = validateCount(countEl);
    const attendOk = validateAttend();

    if (!nameOk || !countOk || !attendOk) {
      // Focus first error
      if (!nameOk) nameEl.focus();
      else if (!countOk) countEl.focus();
      return;
    }

    const attendVal = document.querySelector('input[name="attendance"]:checked');

    submitBtn.disabled = true;
    submitBtn.textContent = 'กำลังส่ง…';

    const payload = {
      ชื่อ: nameEl.value.trim(),
      จำนวน: countEl.value,
      การเข้าร่วม: attendVal.value,
      ติดต่อ: contactEl?.value.trim() || '',
      ข้อความ: noteEl?.value.trim() || '',
    };

    try {
      await fetch(SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (_) {}

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: nameEl.value.trim(), ts: Date.now() }));

    form.style.display = 'none';
    if (thankYou) thankYou.style.display = 'flex';
    burstConfetti();
  });
}
