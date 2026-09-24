import { getAudioCtx } from "./sfx.js";

const NOTE_ICON = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M8 15V5l9-2v10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="5.5" cy="15" r="2.5" stroke="currentColor" stroke-width="1.5"/><circle cx="14.5" cy="13" r="2.5" stroke="currentColor" stroke-width="1.5"/></svg>`;
const PAUSE_ICON = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="5" y="4" width="3" height="12" rx="1" fill="currentColor"/><rect x="12" y="4" width="3" height="12" rx="1" fill="currentColor"/></svg>`;

export function initMusic() {
  const rawUrl =
    window.__weddingConfig?.music_url || "/music/wedding-music.mp3";

  // Route Google Drive URLs through server proxy to avoid CORS/redirect issues
  function resolveAudioUrl(url) {
    if (!url) return url;
    try {
      const u = new URL(url);
      if (
        (u.hostname === "drive.google.com" && u.pathname.startsWith("/uc")) ||
        u.hostname === "drive.usercontent.google.com"
      ) {
        const id = u.searchParams.get("id");
        if (id) return `/api/proxy-audio?id=${encodeURIComponent(id)}`;
      }
    } catch {}
    return url;
  }

  const musicUrl = resolveAudioUrl(rawUrl);
  const audio = new Audio(musicUrl);
  audio.loop = true;

  // iOS ignores audio.volume (read-only), so fades go through a Web Audio
  // gain node. Cross-origin files without CORS would play silent through
  // Web Audio — those keep the plain element volume (fade works off-iOS).
  let sameOrigin = false;
  try {
    sameOrigin = new URL(musicUrl, location.href).origin === location.origin;
  } catch {}
  let gainNode = null;

  function ensureGraph() {
    if (gainNode || !sameOrigin) return;
    const ac = getAudioCtx();
    if (!ac) return;
    try {
      const src = ac.createMediaElementSource(audio);
      gainNode = ac.createGain();
      gainNode.gain.value = 0;
      src.connect(gainNode).connect(ac.destination);
      audio.volume = 1;
    } catch {
      gainNode = null;
    }
  }

  let playing = false;
  let fadeRaf = null; // current element-volume fade frame
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
    if (gainNode) {
      const g = gainNode.gain;
      const now = gainNode.context.currentTime;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
    }
  }

  function setLevel(v) {
    if (gainNode) gainNode.gain.value = v;
    else audio.volume = v;
  }

  function fadeTo(target, duration = 1500, delay = 0) {
    cancelFade();
    if (gainNode) {
      const g = gainNode.gain;
      const t0 = gainNode.context.currentTime + delay;
      g.setValueAtTime(g.value, t0);
      g.linearRampToValueAtTime(target, t0 + duration / 1000);
      return;
    }
    const start = audio.volume;
    const diff = target - start;
    const t0 = performance.now() + delay * 1000;
    function step(now) {
      const p = Math.max(0, Math.min((now - t0) / duration, 1));
      audio.volume = start + diff * p;
      fadeRaf = p < 1 ? requestAnimationFrame(step) : null;
    }
    fadeRaf = requestAnimationFrame(step);
  }

  // Must run inside a user gesture (iOS autoplay policy)
  async function play({ target = 0.55, duration = 1500, delay = 0 } = {}) {
    cancelFade();
    ensureGraph();
    setLevel(0);
    try {
      await audio.play();
      playing = true;
      sync();
      fadeTo(target, duration, delay);
      return true;
    } catch {
      // play() was blocked (autoplay policy etc.) — keep icon as note
      playing = false;
      sync();
      return false;
    }
  }

  async function toggle() {
    if (!playing) {
      setMuted(false);
      await play();
    } else {
      // Pausing: fade out then pause; remember so the envelope won't autoplay
      setMuted(true);
      playing = false;
      sync();
      fadeTo(0, 800);
      pauseTimer = setTimeout(() => {
        audio.pause();
        pauseTimer = null;
      }, 850);
    }
  }

  // Envelope seal tap → music swells in softly as the letter opens
  autoplay = (opts) => {
    if (playing || isMuted()) return;
    play({ target: 0.35, duration: 4000, ...opts });
  };

  ["env-music-btn", "music-btn"].forEach((id) => {
    const b = document.getElementById(id);
    if (!b) return;
    b.innerHTML = NOTE_ICON;
    b.addEventListener("click", toggle);
    btns.push(b);
  });
}

const MUTE_KEY = "music_muted";
function isMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}
function setMuted(on) {
  try {
    if (on) localStorage.setItem(MUTE_KEY, "1");
    else localStorage.removeItem(MUTE_KEY);
  } catch {}
}

let autoplay = () => {};
// Called from the envelope tap (a user gesture). No-op if the guest muted
// the music before, or if initMusic hasn't run.
export function autoplayMusic(opts) {
  autoplay(opts);
}
