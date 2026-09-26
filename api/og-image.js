// Link-preview image addressed to one guest: the captured envelope
// (og/envelope-to.png, rendered by scripts/og-capture.mjs from the real 3D
// envelope with its address line left blank) + "ถึง คุณNAME" written in the
// same Charm hand and ink. Any name works — no guest list.
import fs from "fs";
import path from "path";
import { Resvg } from "@resvg/resvg-js";
import { INK_PEN, salutation } from "../src/js/letter.js";

// Address line geometry in the 1200×630 capture: envelope texture units
// (280×200, line at y=161, 21 units, W-40 wide) × zoom 2.5, centred
const LINE = { x: 600, y: 315 + (161 - 100) * 2.5, size: 21 * 2.5, maxW: 240 * 2.5 };

const DIR = path.join(process.cwd(), "og");
const FONT = { fontFiles: [path.join(DIR, "Charm-Regular.ttf")], loadSystemFonts: false, defaultFontFamily: "Charm" };
let baseHref; // data: URI of the base PNG, read once per warm instance

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const [r, g, b, a] = INK_PEN.match(/[\d.]+/g);
const text = (t, size) =>
  `<text x="${LINE.x}" y="${LINE.y}" text-anchor="middle" font-family="Charm" font-size="${size}" fill="rgb(${r},${g},${b})" fill-opacity="${a}">${esc(t)}</text>`;

export function renderAddressed(line) {
  // shrink long names to fit the line (resvg shapes Thai marks correctly)
  const probe = new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">${text(line, LINE.size)}</svg>`, { font: FONT });
  const w = probe.getBBox()?.width ?? 0;
  const size = w > LINE.maxW ? (LINE.size * LINE.maxW) / w : LINE.size;
  baseHref ??= `data:image/png;base64,${fs.readFileSync(path.join(DIR, "envelope-to.png")).toString("base64")}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630"><image width="1200" height="630" xlink:href="${baseHref}"/>${text(line, size)}</svg>`;
  return new Resvg(svg, { font: FONT }).render().asPng();
}

export default function handler(req, res) {
  const line = salutation(req.query?.to);
  if (!line) {
    res.setHeader("Cache-Control", "public, s-maxage=86400");
    return res.redirect(302, "/og-envelope.png");
  }
  const png = renderAddressed(line);
  res.setHeader("Content-Type", "image/png");
  // the URL carries the name + a ?v= of the shared details — safe forever
  res.setHeader("Cache-Control", "public, max-age=31536000, s-maxage=31536000, immutable");
  res.status(200).send(png);
}
