// Letter content — the short personal note the envelope's letter card
// shows once it expands. Personalized via ?to= when present.
// Returning visitors (same session) and ?goto= links skip it.

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

// The letter overlay itself now lives inside the envelope sequence —
// the card that rises out of the envelope expands into the readable
// letter (see envelope.js expandLetter). This module keeps only the
// content builder so the wording stays unit-testable.
