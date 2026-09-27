// Phone tilt (deviceorientation) for the "held" moments: the envelope before
// it opens, the letter while reading, the sealed envelope at the end.
//
//  - Android & co. deliver readings without asking. Some (Brave, newer
//    Chrome) still expose requestPermission — it resolves "granted" with no
//    prompt, so primeMotion() calls it on the first touch just in case.
//  - iOS needs a tap + system prompt: the envelope's opt-in pill calls
//    requestMotion() from its click.
//
// Readings come out as (x, y) ≈ [-1, 1] relative to how the guest holds the
// phone; the "level" angle drifts toward the current grip, so holding still
// at a new angle eases back to flat in ~2–3 s.
import { isIOS } from "./platform.js";

const RANGE = 22; // degrees of tilt for a full ±1
const DRIFT = 0.012; // per reading (~60/s) → a new grip reads flat in ~2–3 s

const hasApi = () =>
  typeof window !== "undefined" && "DeviceOrientationEvent" in window;
const canAsk = () =>
  hasApi() && typeof DeviceOrientationEvent.requestPermission === "function";

// Only iPhone/iPad need (and get) the opt-in pill
export function needsMotionPrompt() {
  return canAsk() && isIOS();
}

const subs = new Set();
let listening = false;
let level = null;
let readings = 0;

// exported for tests: one reading → (x, y) for every subscriber
export function feed(beta, gamma) {
  if (beta == null || gamma == null) return;
  if (!level) level = { b: beta, g: gamma };
  level.b += (beta - level.b) * DRIFT;
  level.g += (gamma - level.g) * DRIFT;
  readings++;
  const x = (gamma - level.g) / RANGE;
  const y = (beta - level.b) / RANGE;
  subs.forEach((fn) => fn(x, y));
}

function listen() {
  if (listening || !hasApi()) return;
  listening = true;
  window.addEventListener("deviceorientation", (e) => feed(e.beta, e.gamma));
}

// Subscribe; returns the unsubscribe
export function onTilt(fn) {
  subs.add(fn);
  listen();
  return () => subs.delete(fn);
}

export const hasReadings = () => readings > 0;

// Must run inside a tap on iOS. Resolves true when readings may flow.
export async function requestMotion() {
  if (!hasApi()) return false;
  if (!canAsk()) return true;
  try {
    const state = await DeviceOrientationEvent.requestPermission();
    if (state === "granted") listen();
    return state === "granted";
  } catch {
    return false;
  }
}

// Non-iOS browsers that expose the permission call anyway: ask (silently)
// on the first touch
export function primeMotion() {
  if (!canAsk() || isIOS()) return;
  addEventListener("pointerdown", () => requestMotion(), {
    once: true,
    capture: true,
  });
}

// test hook
export function _reset() {
  subs.clear();
  level = null;
  readings = 0;
}
