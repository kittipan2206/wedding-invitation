export function initEnvelope(onComplete) {
  const overlay = document.getElementById("envelope-overlay");
  if (!overlay) {
    onComplete();
    return;
  }

  const body = overlay.querySelector(".envelope-body");
  const flap = overlay.querySelector(".envelope-flap");

  function open() {
    body.removeEventListener("click", open);
    body.removeEventListener("touchend", open);
    body.removeEventListener("keydown", onKeydown);
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
        onComplete();
      }, 500);
    }, 1200);
  }

  // role="button" divs don't fire click on Enter/Space — wire it manually
  function onKeydown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  }

  body.addEventListener("click", open);
  body.addEventListener("touchend", open);
  body.addEventListener("keydown", onKeydown);
}
