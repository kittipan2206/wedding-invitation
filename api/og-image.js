import fs from "fs";
import path from "path";
import sharp from "sharp";

// Load Thai font once per Lambda instance (bundled via vercel.json includeFiles)
let _fontB64 = null;

function getFont() {
  if (_fontB64 !== null) return _fontB64;
  try {
    const fontPath = path.join(
      process.cwd(),
      "public",
      "fonts",
      "NotoSerifThai.woff2",
    );
    _fontB64 = fs.readFileSync(fontPath).toString("base64");
  } catch {
    _fontB64 = "";
  }
  return _fontB64;
}

function escXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSvg({ guestName, groom, bride, dateDisplay, venue, fontB64 }) {
  const couple = `${groom} & ${bride}`;
  const fontFace = fontB64
    ? `@font-face { font-family: 'ThaiFont'; src: url('data:font/woff2;base64,${fontB64}') format('woff2'); }`
    : "";
  const font = fontB64 ? "'ThaiFont', Georgia, serif" : "Georgia, serif";

  // Shorten guest name to 20 chars to stay within image bounds
  const displayName =
    guestName.length > 20 ? guestName.slice(0, 20) + "…" : guestName;

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

  <!-- Floral top-left -->
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

  <!-- Floral top-right (mirrored) -->
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
    fontB64: getFont(),
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
