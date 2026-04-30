const ICON_EXPAND = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
</svg>`;

const ICON_COMPRESS = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>
  <line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/>
</svg>`;

export function initFullscreen() {
  const btn = document.getElementById('fullscreen-btn');
  if (!btn) return;

  // Hide button if Fullscreen API not supported
  if (!document.fullscreenEnabled) {
    btn.style.display = 'none';
    return;
  }

  btn.innerHTML = ICON_EXPAND;

  btn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  document.addEventListener('fullscreenchange', () => {
    btn.innerHTML = document.fullscreenElement ? ICON_COMPRESS : ICON_EXPAND;
    btn.title = document.fullscreenElement ? 'ออกจากเต็มหน้าจอ' : 'เต็มหน้าจอ';
    btn.setAttribute('aria-label', btn.title);
  });
}
