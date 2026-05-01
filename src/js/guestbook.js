const SHEET_URL = 'https://script.google.com/macros/s/AKfycbx3xzXnYpTqjmhY7MjYrgQ03c_9TvtNgYtiP_afh9VbOTDt6E_8As_u32FSX7yKAoQG/exec';

export function initGuestbook() {
  const form = document.getElementById('guestbook-form');
  if (!form) return;
  const thanks = document.getElementById('guestbook-thanks');
  const submitBtn = form.querySelector('button[type="submit"]');

  function showErr(id, show) {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? 'block' : 'none';
  }
  function markError(el, hasError) {
    el.classList.toggle('error', hasError);
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const nameEl = document.getElementById('gb-name');
    const msgEl  = document.getElementById('gb-message');
    let valid = true;

    const nameOk = nameEl.value.trim().length >= 2;
    markError(nameEl, !nameOk); showErr('gb-err-name', !nameOk);
    if (!nameOk) valid = false;

    const msgOk = msgEl.value.trim().length >= 2;
    markError(msgEl, !msgOk); showErr('gb-err-msg', !msgOk);
    if (!msgOk) valid = false;

    if (!valid) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'กำลังส่ง…';

    try {
      await fetch(SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'guestbook',
          ชื่อ: nameEl.value.trim(),
          ข้อความ: msgEl.value.trim(),
        }),
      });
    } catch (_) {}

    form.style.display = 'none';
    if (thanks) thanks.style.display = 'flex';
  });

  document.getElementById('gb-name')?.addEventListener('input', function () {
    if (this.value.trim().length >= 2) { markError(this, false); showErr('gb-err-name', false); }
  });
  document.getElementById('gb-message')?.addEventListener('input', function () {
    if (this.value.trim().length >= 2) { markError(this, false); showErr('gb-err-msg', false); }
  });
}
