import sharp from "sharp";

// NotoSerifThai Light (woff2, Thai subset) — embedded to guarantee Thai glyph
// rendering on Vercel Lambda where system fonts don't include Thai.
const THAI_FONT_B64 = "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";

function escXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSvg({ guestName, groom, bride, dateDisplay, venue }) {
  const couple = `${groom} & ${bride}`;
  const fontFace = `@font-face { font-family: 'ThaiFont'; src: url('data:font/woff2;base64,${THAI_FONT_B64}') format('woff2'); }`;
  const font = "'ThaiFont', Georgia, serif";

  const displayName =
    guestName.length > 20 ? guestName.slice(0, 20) + "\u2026" : guestName;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <style>${fontFace}</style>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff8fa"/>
      <stop offset="40%" stop-color="#fdf0ff"/>
      <stop offset="100%" stop-color="#f0f8ff"/>
    </linearGradient>
    <linearGradient id="ln" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="transparent"/>
      <stop offset="30%" stop-color="#C9B8E8"/>
      <stop offset="70%" stop-color="#F9C8D4"/>
      <stop offset="100%" stop-color="transparent"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="32" y="32" width="1136" height="566" rx="16" fill="none" stroke="#C9B8E8" stroke-width="1.5" stroke-opacity="0.4"/>

  <g opacity="0.55" transform="translate(60,50)">
    <path d="M80 120 Q70 70 50 40" stroke="#B8E8D8" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M80 120 Q90 65 110 38" stroke="#C9B8E8" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M80 120 Q80 60 80 20" stroke="#F9C8D4" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <path d="M62 78 Q40 58 28 70 Q40 85 62 78Z" fill="#B8E8D8" opacity="0.8"/>
    <path d="M98 72 Q120 52 132 64 Q120 79 98 72Z" fill="#C9B8E8" opacity="0.8"/>
    <circle cx="50" cy="36" r="5" fill="#F9C8D4" opacity="0.9"/>
    <circle cx="110" cy="33" r="5" fill="#C9B8E8" opacity="0.9"/>
    <circle cx="80" cy="16" r="6" fill="#F8D8B8" opacity="0.9"/>
  </g>

  <g opacity="0.55" transform="translate(1060,50) scale(-1,1)">
    <path d="M80 120 Q70 70 50 40" stroke="#B8E8D8" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M80 120 Q90 65 110 38" stroke="#C9B8E8" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M80 120 Q80 60 80 20" stroke="#F9C8D4" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <path d="M62 78 Q40 58 28 70 Q40 85 62 78Z" fill="#B8E8D8" opacity="0.8"/>
    <path d="M98 72 Q120 52 132 64 Q120 79 98 72Z" fill="#C9B8E8" opacity="0.8"/>
    <circle cx="50" cy="36" r="5" fill="#F9C8D4" opacity="0.9"/>
    <circle cx="110" cy="33" r="5" fill="#C9B8E8" opacity="0.9"/>
    <circle cx="80" cy="16" r="6" fill="#F8D8B8" opacity="0.9"/>
  </g>

  <text x="600" y="198" text-anchor="middle" font-family="${font}" font-size="17" fill="#8A7F7A" letter-spacing="7">WEDDING INVITATION</text>

  <text x="600" y="278" text-anchor="middle" font-family="${font}" font-size="42" fill="#4A3F5C" font-style="italic">ถึง คุณ${escXml(displayName)}</text>

  <rect x="280" y="308" width="640" height="1" fill="url(#ln)"/>

  <text x="600" y="403" text-anchor="middle" font-family="${font}" font-size="92" fill="#4A3F5C" font-weight="300">${escXml(couple)}</text>

  <rect x="280" y="432" width="640" height="1" fill="url(#ln)"/>

  <text x="600" y="476" text-anchor="middle" font-family="${font}" font-size="20" fill="#8A7F7A">${escXml(dateDisplay)}  •  ${escXml(venue)}</text>

  <g opacity="0.45" transform="translate(540,530)">
    <circle cx="0" cy="0" r="5" fill="#F9C8D4"/>
    <circle cx="30" cy="-8" r="4" fill="#C9B8E8"/>
    <circle cx="60" cy="0" r="5" fill="#B8E8D8"/>
    <circle cx="90" cy="-6" r="4" fill="#F8D8B8"/>
    <circle cx="120" cy="0" r="5" fill="#F9C8D4"/>
  </g>
</svg>`;
}

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const rawName = url.searchParams.get("to") || "";
  const guestName = rawName.replace(/[<>"]/g, "").slice(0, 40).trim();

  if (!guestName) {
    res.setHeader("Location", "/og-image.png");
    res.status(302).end();
    return;
  }

  const svg = buildSvg({
    guestName,
    groom: "นนท์",
    bride: "เมย์",
    dateDisplay: "วันเสาร์ที่ 15 มีนาคม พ.ศ. 2569",
    venue: "สตูล",
  });

  try {
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    res.setHeader("Content-Type", "image/png");
    res.setHeader(
      "Cache-Control",
      "s-maxage=86400, stale-while-revalidate=3600",
    );
    res.send(png);
  } catch {
    res.setHeader("Location", "/og-image.png");
    res.status(302).end();
  }
}
