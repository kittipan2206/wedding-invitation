// Letter content — the short personal note the envelope's letter card
// shows once it expands. Personalized via ?to= when present.
// Returning visitors (same session) and ?goto= links skip it.

// Pen ink for the handwritten address — the 3D envelope and api/og-image.js
// (which writes names onto the captured envelope) use the same colour
export const INK_PEN = "rgba(62,48,54,0.9)";

const MAX_NAME = 40; // graphemes — longer ?to= values are cut with "…"

// A ?to= value made safe to show: trimmed, control chars dropped, capped by
// grapheme (never splits a Thai tone mark from its consonant)
export function clipName(raw) {
  const name = String(raw ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  const seg = new Intl.Segmenter("th", { granularity: "grapheme" });
  const g = Array.from(seg.segment(name), (s) => s.segment);
  return g.length > MAX_NAME ? `${g.slice(0, MAX_NAME - 1).join("")}…` : name;
}

// "ถึง คุณต้น" — shared by the letter, the envelope front and link previews.
// ?to= links often already include the honorific ("?to=คุณสมชาย") —
// don't stack a second "คุณ" in front of it
export function salutation(guestName) {
  const name = clipName(guestName);
  return name ? (/^คุณ/.test(name) ? `ถึง ${name}` : `ถึง คุณ${name}`) : "";
}

// Link-preview title — api/og.js serves it, the send-invites page (card.html)
// shows it in its LINE preview
export function previewTitle(couple, dateDisplay, guestName) {
  const to = salutation(guestName);
  return to
    ? `${to} — ${couple} ขอเรียนเชิญร่วมงานแต่งงาน`
    : `${couple} — ขอเรียนเชิญร่วมงานแต่งงาน ${dateDisplay}`;
}

// The guest's own invite link (bare site link without a name)
export function inviteLink(origin, guestName) {
  const name = clipName(guestName);
  return name ? `${origin}/?to=${encodeURIComponent(name)}` : `${origin}/`;
}

export function letterContent(cfg, guestName) {
  const groom = cfg?.groom_name || "นนท์";
  const bride = cfg?.bride_name || "เมย์";
  const dateDisplay = cfg?.event_date_display || "วันสำคัญของเรา";
  return {
    to: salutation(guestName) || "ถึงคนสำคัญของเรา",
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
