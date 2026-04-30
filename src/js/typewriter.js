export function initTypewriter(
  selector,
  { startDelay = 600, charDelay = 55 } = {},
) {
  const el = document.querySelector(selector);
  if (!el) return;

  const text = el.textContent.trim();
  const chars = [...text]; // Unicode-safe split (handles Thai correctly)
  el.textContent = "";
  el.classList.add("typewriter-active");

  setTimeout(() => {
    let i = 0;
    const timer = setInterval(() => {
      i++;
      el.textContent = chars.slice(0, i).join("");
      if (i >= chars.length) {
        clearInterval(timer);
        // Keep cursor blinking a moment, then fade it out
        setTimeout(() => el.classList.remove("typewriter-active"), 1800);
      }
    }, charDelay);
  }, startDelay);
}
