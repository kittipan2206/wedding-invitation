const NOTE_ICON  = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M8 15V5l9-2v10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="5.5" cy="15" r="2.5" stroke="currentColor" stroke-width="1.5"/><circle cx="14.5" cy="13" r="2.5" stroke="currentColor" stroke-width="1.5"/></svg>`;
const PAUSE_ICON = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="5" y="4" width="3" height="12" rx="1" fill="currentColor"/><rect x="12" y="4" width="3" height="12" rx="1" fill="currentColor"/></svg>`;

export function initMusic() {
  const audio = new Audio('/music/wedding-music.mp3');
  audio.loop = true;
  audio.volume = 0;

  let playing = false;
  const btns = [];

  function sync() {
    btns.forEach(b => {
      b.innerHTML = playing ? PAUSE_ICON : NOTE_ICON;
      b.classList.toggle('is-playing', playing);
    });
  }

  function fadeTo(target, duration = 1500) {
    const start = audio.volume;
    const diff  = target - start;
    const t0    = performance.now();
    (function step(now) {
      const p = Math.min((now - t0) / duration, 1);
      audio.volume = start + diff * p;
      if (p < 1) requestAnimationFrame(step);
    })(performance.now());
  }

  function toggle() {
    if (audio.paused) {
      audio.play();
      fadeTo(0.55);
      playing = true;
    } else {
      fadeTo(0, 800);
      setTimeout(() => audio.pause(), 850);
      playing = false;
    }
    sync();
  }

  ['env-music-btn', 'music-btn'].forEach(id => {
    const b = document.getElementById(id);
    if (!b) return;
    b.innerHTML = NOTE_ICON;
    b.addEventListener('click', toggle);
    btns.push(b);
  });
}
