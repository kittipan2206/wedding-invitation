const NOTE_ICON = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M8 15V5l9-2v10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="5.5" cy="15" r="2.5" stroke="currentColor" stroke-width="1.5"/><circle cx="14.5" cy="13" r="2.5" stroke="currentColor" stroke-width="1.5"/></svg>`;
const PAUSE_ICON = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="5" y="4" width="3" height="12" rx="1" fill="currentColor"/><rect x="12" y="4" width="3" height="12" rx="1" fill="currentColor"/></svg>`;

export function initMusic() {
  const audio = new Audio("/music/wedding-music.mp3");
  audio.loop = true;
  audio.volume = 0;

  let playing = false;
  let fadeRaf = null; // current fade animation frame
  let pauseTimer = null; // scheduled pause timeout
  const btns = [];

  function sync() {
    btns.forEach((b) => {
      b.innerHTML = playing ? PAUSE_ICON : NOTE_ICON;
      b.classList.toggle("is-playing", playing);
    });
  }

  function cancelFade() {
    if (fadeRaf) {
      cancelAnimationFrame(fadeRaf);
      fadeRaf = null;
    }
    if (pauseTimer) {
      clearTimeout(pauseTimer);
      pauseTimer = null;
    }
  }

  function fadeTo(target, duration = 1500) {
    cancelFade();
    const start = audio.volume;
    const diff = target - start;
    const t0 = performance.now();
    function step(now) {
      const p = Math.min((now - t0) / duration, 1);
      audio.volume = start + diff * p;
      if (p < 1) {
        fadeRaf = requestAnimationFrame(step);
      } else {
        fadeRaf = null;
      }
    }
    fadeRaf = requestAnimationFrame(step);
  }

  async function toggle() {
    if (!playing) {
      // Resuming: cancel any pending fade-out/pause
      cancelFade();
      // Reset volume to 0 so fade-in works correctly even if faded-out mid-way
      audio.volume = 0;
      try {
        await audio.play();
        playing = true;
        sync();
        fadeTo(0.55);
      } catch {
        // play() was blocked (autoplay policy etc.) — keep icon as note
        playing = false;
        sync();
      }
    } else {
      // Pausing: fade out then pause
      playing = false;
      sync();
      fadeTo(0, 800);
      pauseTimer = setTimeout(() => {
        audio.pause();
        pauseTimer = null;
      }, 850);
    }
  }

  ["env-music-btn", "music-btn"].forEach((id) => {
    const b = document.getElementById(id);
    if (!b) return;
    b.innerHTML = NOTE_ICON;
    b.addEventListener("click", toggle);
    btns.push(b);
  });
}
