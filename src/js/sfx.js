// Shared Web Audio context + recorded envelope sound effects (public/sfx/,
// CC0 foley). Buffers are fetched and decoded while the envelope idles, so
// the tap plays with zero latency. A missing/undecodable file stays silent —
// no synthesized stand-ins (they sound fake).
//
// iOS: the context may be created early but only starts inside a user
// gesture — getAudioCtx() resumes it on the envelope tap / music button.

const FILES = {
  crack: "/sfx/wax-crack.mp3",
  flap: "/sfx/flap-open.mp3",
  slide: "/sfx/card-slide.mp3",
};

let ctx = null;
const buffers = {};

export function getAudioCtx() {
  if (ctx) {
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
  } catch {
    return null;
  }
  return ctx;
}

export function preloadSfx() {
  const ac = getAudioCtx();
  if (!ac) return;
  Object.entries(FILES).forEach(([name, url]) => {
    fetch(url)
      // the dev server answers missing files with index.html — audio only
      .then((r) =>
        r.ok && (r.headers.get("content-type") || "").startsWith("audio/")
          ? r.arrayBuffer()
          : Promise.reject(),
      )
      // callback form for old Safari; newer engines also return a promise,
      // which must be caught or a bad file surfaces as a page error
      .then(
        (data) =>
          new Promise((ok, fail) =>
            ac.decodeAudioData(data, ok, fail)?.catch?.(() => {}),
          ),
      )
      .then((buf) => (buffers[name] = buf))
      .catch(() => {});
  });
}

function play(name, { delay = 0, gain = 1 } = {}) {
  const ac = getAudioCtx();
  const buf = buffers[name];
  if (!ac || !buf) return;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const g = ac.createGain();
  g.gain.value = gain;
  src.connect(g).connect(ac.destination);
  src.start(ac.currentTime + delay);
}

export const playCrack = (delay) => play("crack", { delay, gain: 0.8 });
export const playFlap = (delay) => play("flap", { delay, gain: 1 });
export const playSlide = (delay) => play("slide", { delay, gain: 0.5 });
