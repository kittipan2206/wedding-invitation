// Platform detection for the smart calendar/map actions.
// Pure functions over a UA string so both the browser and unit tests can
// inject fixtures; browser callers use the no-arg defaults.

export function isIOS(
  ua = navigator.userAgent,
  maxTouchPoints = navigator.maxTouchPoints ?? 0,
) {
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  // iPadOS 13+ reports itself as a Mac — the touch screen gives it away
  return /Macintosh/.test(ua) && maxTouchPoints > 1;
}

export function isApple(
  ua = navigator.userAgent,
  maxTouchPoints = navigator.maxTouchPoints ?? 0,
) {
  return isIOS(ua, maxTouchPoints) || /Macintosh|Mac OS X/.test(ua);
}

// LINE's in-app browser marks itself "Line/<version>" in the UA.
// It honors the openExternalBrowser=1 query param to break out to Safari.
export function isLineApp(ua = navigator.userAgent) {
  return /\bLine\//i.test(ua);
}

// In-app browsers (LINE / Facebook / Instagram / Messenger) can't save blob
// downloads reliably — .ics must be served from a real URL for them.
export function isInAppBrowser(ua = navigator.userAgent) {
  return (
    isLineApp(ua) || /FBAN|FBAV|FB_IAB|Instagram|MessengerForiOS/i.test(ua)
  );
}

// Real-3D (WebGL2) envelope scenes — the opening and the closing letter.
// E2E runners drive the CSS versions; a dedicated test opts into 3D.
// (probed once per page: creating even a throwaway WebGL context is one of
// the costliest things the page does on load)
let has3D;
export function want3D() {
  if (window.__ENVELOPE_MODE) return window.__ENVELOPE_MODE === "3d";
  return (has3D ??= probe3D());
}
function probe3D() {
  if (navigator.webdriver) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    return false;
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

// index.html loads the web-font CSS without blocking first paint and
// exposes window.__fontsCss. Until it lands, document.fonts.ready resolves
// at once (no faces declared yet) — so wait for the stylesheet first.
export function fontsReady() {
  return Promise.resolve(window.__fontsCss).then(() => document.fonts.ready);
}
