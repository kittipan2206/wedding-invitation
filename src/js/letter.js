// Letter interstitial — a short personal note shown right after the envelope
// opens, before the main invitation. Personalized via ?to= when present.
// Returning visitors (envelope already opened) and ?goto= links skip it.

export function letterContent(cfg, guestName) {
  const groom = cfg?.groom_name || "นนท์";
  const bride = cfg?.bride_name || "เมย์";
  const dateDisplay = cfg?.event_date_display || "วันสำคัญของเรา";
  // ?to= links often already include the honorific ("?to=คุณสมชาย") —
  // don't stack a second "คุณ" in front of it
  const name = guestName?.trim();
  const salutation =
    name && (/^คุณ/.test(name) ? `ถึง ${name}` : `ถึง คุณ${name}`);
  return {
    to: salutation || "ถึงคนสำคัญของเรา",
    body:
      `ขอบคุณที่อยู่ในช่วงเวลาดีๆ ของเราเสมอมา ` +
      `${dateDisplay} คือวันที่สำคัญที่สุดของเราสองคน ` +
      `และมันจะสมบูรณ์กว่านี้อีกมาก ถ้ามีคุณอยู่ตรงนั้นด้วยกัน`,
    sign: `ด้วยรัก — ${groom} & ${bride}`,
  };
}

export function showLetter(onDone) {
  const params = new URLSearchParams(window.location.search);
  const guestName = params.get("to");
  const { to, body, sign } = letterContent(window.__weddingConfig, guestName);

  const overlay = document.createElement("div");
  overlay.id = "letter-overlay";
  overlay.innerHTML = `
    <div class="letter-paper" role="dialog" aria-label="จดหมายจากเจ้าบ่าวเจ้าสาว">
      <p class="letter-to"></p>
      <p class="letter-body"></p>
      <p class="letter-sign"></p>
      <button type="button" class="letter-continue">เปิดการ์ดเชิญ ♡</button>
    </div>`;
  overlay.querySelector(".letter-to").textContent = to;
  overlay.querySelector(".letter-body").textContent = body;
  overlay.querySelector(".letter-sign").textContent = sign;
  document.body.appendChild(overlay);

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    overlay.classList.add("letter--closing");
    setTimeout(() => {
      overlay.remove();
      onDone();
    }, 450);
  }

  overlay.querySelector(".letter-continue").addEventListener("click", close);
  // Tapping outside the paper also continues — never trap the guest
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Enter" || e.key === "Escape" || e.key === " ") close();
    },
    { once: true },
  );
}
