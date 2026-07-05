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
