// Send-invites tool (card.html) — the couple types a guest's name and gets:
//  - a preview of the LINE message (the addressed envelope from
//    /api/og-image + the same title api/og.js serves)
//  - the guest's link, sent via LINE's share sheet or copied
//  - an image card in the letter's style, drawn on canvas (no html2canvas)
import { fetchConfig, injectConfig } from "./config.js";
import { qrDataUrl } from "./qr.js";
import { copyText } from "./smart-calendar.js";
import {
  INK_PEN,
  clipName,
  inviteLink,
  previewTitle,
  salutation,
} from "./letter.js";
import { LETTER_MARGIN, foilMonogram, letterPaper } from "./paper.js";

const ORIGIN = window.location.origin;
const SERIF = `"Trirong", serif`;
const SANS = `"IBM Plex Sans Thai Looped", sans-serif`;
const SCRIPT = `"Charm", "Trirong", serif`;
const MUTED = "#8a7f7a";
const INK = "#3a2f36";
const ROSE = "#9a5c74";

// ── Image card: 540×675 CSS px drawn at 2× → 1080×1350 ──────────────────
const CW = 540;
const CH = 675;
const INSET = 30; // linen showing around the sheet

async function loadImage(src) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

export async function drawInviteCard(c, guestName) {
  const couple = `${c.groom_name} & ${c.bride_name}`;
  const to = salutation(guestName);
  await Promise.all(
    [
      `italic 400 50px "Cormorant Garamond"`,
      `400 20px ${SERIF}`,
      `400 15px ${SANS}`,
      `400 26px ${SCRIPT}`,
    ].map((f) => document.fonts.load(f, `${couple}${to}กขค`)),
  ).catch(() => {});
  // big source: the code snaps to whole pixels per module — a long Thai
  // ?to= makes it dense, and a small canvas shrinks it
  const qrSrc = await qrDataUrl(inviteLink(ORIGIN, guestName), 640);

  const canvas = document.createElement("canvas");
  canvas.width = CW * 2;
  canvas.height = CH * 2;
  const ctx = canvas.getContext("2d");
  ctx.scale(2, 2);

  // linen surface, as under the envelope
  const bg = ctx.createRadialGradient(CW / 2, CH / 2, 0, CW / 2, CH / 2, CH * 0.75);
  bg.addColorStop(0, "#ece7e1");
  bg.addColorStop(1, "#d9d1c9");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CW, CH);

  // the letter's own sheet + its shadow
  const sw = CW - 2 * INSET;
  const sh = CH - 2 * INSET;
  const sheet = letterPaper(sw, sh);
  const M = LETTER_MARGIN;
  ctx.drawImage(sheet.shadow, INSET - M, INSET - M, sw + 2 * M, sh + 2 * M);
  ctx.drawImage(sheet.face, INSET, INSET, sw, sh);

  const line = (text, y, font, color, max = sw - 60) => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText(text, CW / 2, y, max);
  };

  // without an addressee the block closes up (no hole where the name was)
  const k = to ? 0 : 1;
  line("ขอเรียนเชิญร่วมงานแต่งงาน", 96 + 10 * k, `400 15px ${SANS}`, MUTED);
  foilMonogram(ctx, CW, couple, 50, 168 + 14 * k);
  if (to) line(to, 222, `400 26px ${SCRIPT}`, INK_PEN);
  line("♡", 262 - 22 * k, `400 14px ${SANS}`, ROSE);

  const d = -18 * k; // details, QR and footer rise with the heart
  line(c.event_date_display, 308 + d, `400 20px ${SERIF}`, INK);
  line(
    `เริ่มพิธี ${c.event_time_ceremony} น. · รับประทานอาหาร ${c.event_time_lunch} น.`,
    342 + d,
    `400 15px ${SANS}`,
    INK,
  );
  const venue = c.venue_name.match(/^(.+?)\s+(จังหวัด.+)$/);
  (venue ? [venue[1], venue[2]] : [c.venue_name]).forEach((v, i) =>
    line(
      i ? v : `ณ ${v.replace(/,\s*$/, "")}`,
      372 + i * 22 + d,
      `400 15px ${SANS}`,
      INK,
    ),
  );
  line(`การแต่งกาย: ${c.dress_code}`, 424 + d, `400 14px ${SANS}`, MUTED);

  const qr = await loadImage(qrSrc);
  ctx.drawImage(qr, CW / 2 - 62, 446 + d / 2, 124, 124);
  line("สแกนเพื่อเปิดการ์ดและตอบรับ", 584 + d / 3, `400 12px ${SANS}`, MUTED);
  line(
    `กรุณาตอบรับภายในวันที่ ${c.rsvp_deadline_display}`,
    614,
    `500 13px ${SANS}`,
    ROSE,
  );
  return canvas;
}

// ── Page wiring ─────────────────────────────────────────────────────────
function flash(el, text) {
  const label = el.dataset.label || (el.dataset.label = el.textContent);
  el.textContent = text;
  clearTimeout(el._flash);
  el._flash = setTimeout(() => (el.textContent = label), 1800);
}

document.addEventListener("DOMContentLoaded", async () => {
  const $ = (id) => document.getElementById(id);
  const input = $("guest-name");
  const previewImg = $("line-preview-img");
  const thumb = $("card-thumb");
  // /api/og-image only exists on Vercel — dev falls back to the plain envelope
  previewImg.addEventListener("error", () => {
    if (!previewImg.src.endsWith("/og-envelope.png")) previewImg.src = "/og-envelope.png";
  });
  $("line-preview-domain").textContent = window.location.host;

  let card = null; // latest drawn image card

  // wired before the config wait — they don't need it, and a tap during
  // a slow GAS answer must not fall on the floor
  $("copy-link-btn").addEventListener("click", async (e) => {
    const btn = e.currentTarget; // null once the await below resumes
    const ok = await copyText(inviteLink(ORIGIN, input.value));
    flash(btn, ok ? "คัดลอกแล้ว ✓" : "คัดลอกไม่สำเร็จ");
  });

  $("download-card-btn").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    if (!card) return;
    const name = clipName(input.value);
    const blob = await new Promise((ok) => card.toBlob(ok, "image/png"));
    if (!blob) return flash(btn, "สร้างรูปไม่สำเร็จ");
    const file = new File([blob], name ? `การ์ดเชิญ-${name}.png` : "การ์ดเชิญ.png", {
      type: "image/png",
    });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    } catch (err) {
      if (err?.name === "AbortError") return; // the couple closed the sheet
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  injectConfig(await fetchConfig());
  const cfg = () => window.__weddingConfig;
  $("invite-couple").textContent = `${cfg().groom_name} & ${cfg().bride_name}`;
  document.title = `ส่งการ์ดเชิญ — ${cfg().groom_name} & ${cfg().bride_name}`;

  let drawToken = 0;
  let slow = 0;

  function update() {
    const name = clipName(input.value);
    const link = inviteLink(ORIGIN, name);
    const c = cfg();
    $("line-preview-title").textContent = previewTitle(
      `${c.groom_name} & ${c.bride_name}`,
      c.event_date_display,
      name,
    );
    // readable Thai on screen; the encoded link is what gets sent/copied
    $("invite-link").textContent = decodeURI(link);
    $("invite-link").dataset.href = link;
    $("send-line-btn").href = `https://line.me/R/share?text=${encodeURIComponent(link)}`;

    // images wait for a typing pause (each name is a new og-image render)
    clearTimeout(slow);
    slow = setTimeout(async () => {
      previewImg.src = name
        ? `/api/og-image?to=${encodeURIComponent(name)}`
        : "/og-envelope.png";
      const token = ++drawToken;
      const canvas = await drawInviteCard(cfg(), name);
      if (token !== drawToken) return; // a newer name is being drawn
      card = canvas;
      thumb.src = canvas.toDataURL("image/png");
    }, 450);
  }

  input.addEventListener("input", update);
  update();
});
