const SHEET_URL = 'https://script.google.com/macros/s/AKfycbx3xzXnYpTqjmhY7MjYrgQ03c_9TvtNgYtiP_afh9VbOTDt6E_8As_u32FSX7yKAoQG/exec';
const RSVP_KEY  = 'rsvp_submitted_v1';

// ── Render ──────────────────────────────────────────────────────────────────

function renderFeed(entries) {
  const feed = document.getElementById('guestbook-feed');
  if (!feed) return;

  if (!entries || entries.length === 0) {
    feed.innerHTML = '';
    return;
  }

  feed.innerHTML = entries.map(e => `
    <div class="gb-entry">
      <div class="gb-entry-avatar">${escHtml(Array.from(e.name)[0] || '♡')}</div>
      <div class="gb-entry-body">
        <p class="gb-entry-name">${escHtml(e.name)}</p>
        <p class="gb-entry-msg">${escHtml(e.message)}</p>
      </div>
    </div>
  `).join('');
}

function renderLoading() {
  const feed = document.getElementById('guestbook-feed');
  if (feed) feed.innerHTML = '<p class="gb-loading">กำลังโหลดคำอวยพร…</p>';
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Remote fetch ─────────────────────────────────────────────────────────────

async function fetchEntries() {
  try {
    const res = await fetch(SHEET_URL, { method: 'GET', redirect: 'follow' });
    const data = await res.json();
    if (Array.isArray(data)) return data;
  } catch (_) {}
  return null;
}

// ── Init ─────────────────────────────────────────────────────────────────────

export function initGuestbook() {
  const form      = document.getElementById('guestbook-form');
  const thanks    = document.getElementById('guestbook-thanks');
  const submitBtn = form?.querySelector('button[type="submit"]');
  if (!form) return;

  // Auto-fill name from RSVP
  try {
    const rsvp = JSON.parse(localStorage.getItem(RSVP_KEY));
    if (rsvp?.name) {
      const nameEl = document.getElementById('gb-name');
      if (nameEl && !nameEl.value) nameEl.value = rsvp.name;
    }
  } catch {}

  // Load remote entries
  renderLoading();
  fetchEntries().then(entries => {
    renderFeed(entries || []);
  });

  // Char counter
  const msgEl   = document.getElementById('gb-message');
  const counter = document.getElementById('gb-char-counter');
  if (msgEl && counter) {
    msgEl.addEventListener('input', () => {
      counter.textContent = `${msgEl.value.length} / 300 ตัวอักษร`;
    });
  }

  function showErr(id, show) {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? 'block' : 'none';
  }
  function markError(el, hasError) {
    el.classList.toggle('error', hasError);
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

  // Submit
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

    // Optimistic: prepend new entry to current feed immediately
    const feed = document.getElementById('guestbook-feed');
    if (feed) {
      const card = document.createElement('div');
      card.className = 'gb-entry gb-entry--new';
      card.innerHTML = `
        <div class="gb-entry-avatar">${escHtml(Array.from(name)[0] || '♡')}</div>
        <div class="gb-entry-body">
          <p class="gb-entry-name">${escHtml(name)}</p>
          <p class="gb-entry-msg">${escHtml(message)}</p>
        </div>`;
      feed.prepend(card);
    }

    form.style.display = 'none';
    if (thanks) thanks.style.display = 'flex';
  });
}
