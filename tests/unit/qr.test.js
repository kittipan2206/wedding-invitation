import { describe, it, expect } from "vitest";
import { QR_INK, QR_PAPER, QR_WAX, styledQrOptions } from "../../src/js/qr.js";

// WCAG relative luminance → contrast ratio
const lum = (hex) => {
  const [r, g, b] = hex.match(/\w\w/g).map((h) => {
    const c = parseInt(h, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => (lum(b) + 0.05) / (lum(a) + 0.05);

describe("themed QR stays scannable", () => {
  it("prints dark modules on light paper with strong contrast", () => {
    expect(contrast(QR_INK, QR_PAPER)).toBeGreaterThan(7);
    expect(contrast(QR_WAX, QR_PAPER)).toBeGreaterThan(4.5);
  });

  it("uses high error correction under the centre seal", () => {
    const o = styledQrOptions("https://x.test/?to=ต้น", 300);
    expect(o.qrOptions.errorCorrectionLevel).toBe("H");
    expect(o.imageOptions.imageSize).toBeLessThanOrEqual(0.3);
    expect(o.margin).toBeGreaterThan(0); // quiet zone
  });
});
