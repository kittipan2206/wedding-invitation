const ENVELOPE_KEY = "envelope_opened";

export function initEnvelope(onComplete) {
  const overlay = document.getElementById("envelope-overlay");
  if (!overlay) {
    onComplete();
    return;
  }

  // If already opened this session, skip animation immediately
  if (sessionStorage.getItem(ENVELOPE_KEY) === "1") {
    overlay.style.display = "none";
    onComplete();
    return;
  }

  const body = overlay.querySelector(".envelope-body");
  const flap = overlay.querySelector(".envelope-flap");

  function open() {
    body.removeEventListener("click", open);
    body.removeEventListener("touchend", open);
    body.style.cursor = "default";

    // 1. Animate flap open
    flap.style.animation = "flapOpen 0.6s cubic-bezier(.23,1,.32,1) forwards";

    // 2. After flap opens, slide card up
    setTimeout(() => {
      body.style.animation =
        "cardSlideUp 0.7s cubic-bezier(.23,1,.32,1) forwards";
    }, 500);

    // 3. Fade out overlay
    setTimeout(() => {
      overlay.style.animation = "overlayFadeOut 0.5s ease forwards";
      setTimeout(() => {
        overlay.style.display = "none";
        sessionStorage.setItem(ENVELOPE_KEY, "1");
        onComplete();
      }, 500);
    }, 1200);
  }

  body.addEventListener("click", open);
  body.addEventListener("touchend", open);
}
