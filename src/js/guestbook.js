const SHEET_URL = 'https://script.google.com/macros/s/AKfycbx3xzXnYpTqjmhY7MjYrgQ03c_9TvtNgYtiP_afh9VbOTDt6E_8As_u32FSX7yKAoQG/exec';
const ENTRIES_KEY = 'guestbook_entries';
const RSVP_KEY    = 'rsvp_submitted_v1';

function loadEntries() {
  try { return JSON.parse(localStorage.getItem(ENTRIES_KEY)) || []; } catch { return []; }
}

function saveEntry(entry) {
  const entries = loadEntries();
  entries.unshift(entry);
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries.slice(0, 50)));
}

function renderFeed() {
  const feed = document.getElementById('guestbook-feed');
  if (!feed) return;
  const entries = loadEntries();
  if (entries.length === 0) { feed.innerHTML = ''; return; }

  feed.innerHTML = entries.map(e => `
    <div class="gb-entry">
      <div class="gb-entry-avatar">${Array.from(e.name)[0] || '♡'}</div>
      <div class="gb-entry-body">
        <p class="gb-entry-name">${escHtml(e.name)}</p>
        <p class="gb-entry-msg">${escHtml(e.message)}</p>
      </div>
    </div>
  `).join('');
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function initGuestbook() {
  const form = document.getElementById('guestbook-form');
  if (!form) return;
  const thanks    = document.getElementById('guestbook-thanks');
  const submitBtn = form.querySelector('button[type="submit"]');

  // Render any existing local entries
  renderFeed();

  // Auto-fill name from RSVP data
  try {
    const rsvpData = JSON.parse(localStorage.getItem(RSVP_KEY));
    if (rsvpData?.name) {
      const nameEl = document.getElementById('gb-name');
      if (nameEl && !nameEl.value) nameEl.value = rsvpData.name;
    }
  } catch {}

  function showErr(id, show) {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? 'block' : 'none';
  }
  function markError(el, hasError) {
    el.classList.toggle('error', hasError);
  }

  // Char counter
  const msgEl   = document.getElementById('gb-message');
  const counter = document.getElementById('gb-char-counter');
  if (msgEl && counter) {
    msgEl.addEventListener('input', () => {
      counter.textContent = `${msgEl.value.length} / 300 ตัวอักษร`;
    });
  }

  // onBlur validation
  document.getElementById('gb-name')?.addEventListener('blur', function () {
    const ok = this.value.trim().length >= 2;
    markError(this, !ok); showErr('gb-err-name', !ok);
  });

  document.getElementById('gb-name')?.addEventListener('input', function () {
    if (this.value.trim().length >= 2) { markError(this, false); showErr('gb-err-name', false); }
  });
  document.getElementById('gb-message')?.addEventListener('input', function () {
    if (this.value.trim().length >= 2) { markError(this, false); showErr('gb-err-msg', false); }
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const nameEl = document.getElementById('gb-name');
    const msgElF = document.getElementById('gb-message');
    let valid = true;

    const nameOk = nameEl.value.trim().length >= 2;
    markError(nameEl, !nameOk); showErr('gb-err-name', !nameOk);
    if (!nameOk) valid = false;

    const msgOk = msgElF.value.trim().length >= 2;
    markError(msgElF, !msgOk); showErr('gb-err-msg', !msgOk);
    if (!msgOk) valid = false;

    if (!valid) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'กำลังส่ง…';

    const name    = nameEl.value.trim();
    const message = msgElF.value.trim();

    try {
      await fetch(SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'guestbook', ชื่อ: name, ข้อความ: message }),
      });
    } catch (_) {}

    saveEntry({ name, message, ts: Date.now() });
    renderFeed();

    form.style.display = 'none';
    if (thanks) thanks.style.display = 'flex';
  });
}
