// Renders the link-preview envelope from the real three.js scene.
//   npm run dev -- --port 5199   (in another shell)
//   node scripts/og-capture.mjs [baseUrl]
// Writes public/og-envelope.png (the generic preview) and
// og/envelope-to.png (blank address line — api/og-image.js writes the
// guest's name onto it). Re-run after changing the envelope's look.
// OG_MOCKUP_TO=ต้น OG_MOCKUP_OUT=dir also renders a fully 3D-addressed one.
import { chromium } from "@playwright/test";
import sharp from "sharp";

const BASE = process.argv[2] || "http://localhost:5199";
const SHOTS = [
  { file: "public/og-envelope.png", query: "", capture: { reserveTo: false } },
  { file: "og/envelope-to.png", query: "", capture: { reserveTo: true } },
  ...(process.env.OG_MOCKUP_TO
    ? [{
        file: `${process.env.OG_MOCKUP_OUT || "."}/mockup-to.png`,
        query: `?to=${encodeURIComponent(process.env.OG_MOCKUP_TO)}`,
        capture: {},
      }]
    : []),
];
const LOOK = { zoom: Number(process.env.OG_ZOOM || 2.5), y: 0, tilt: JSON.parse(process.env.OG_TILT || "[0,0]") };

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const shot of SHOTS) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
  await page.addInitScript((c) => {
    window.__ENVELOPE_MODE = "3d";
    window.__OG_CAPTURE = c;
  }, { ...LOOK, ...shot.capture });
  await page.goto(`${BASE}/${shot.query}`);
  await page.waitForSelector("#envelope-overlay canvas", { timeout: 30_000 });
  await page.addStyleTag({
    content: `.envelope-label,.env-skip,#env-music-btn,#env-fullscreen-btn,#page-loader{display:none!important}`,
  });
  await page.waitForTimeout(2500); // tilt eases in, textures upload
  const png = await page.screenshot();
  await sharp(png).resize(1200, 630, { kernel: "lanczos3" }).png().toFile(shot.file);
  console.log("wrote", shot.file);
  await page.close();
}
await browser.close();
