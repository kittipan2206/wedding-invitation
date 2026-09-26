// Styled QR generator — shared by the venue display and the invite card.
// Rendered locally so nothing depends on a third-party QR service being
// reachable at the venue, and the invite card's canvas never gets tainted
// (data: URLs are same-origin).
import QRCodeStyling from "qr-code-styling";

// The wax seal (same art as the favicon and the envelope's seal) sits in
// the centre — the one round thing on a square, letterpress-printed code.
import sealSvg from "../../public/favicon.svg?raw";

const SEAL = `data:image/svg+xml;utf8,${encodeURIComponent(sealSvg)}`;

// Stationery palette: plum ink printed on the letter's ivory card, finder
// centres in wax rose. Kept dark-on-light for scanners (see qr.test.js).
export const QR_INK = "#4a3a48";
export const QR_PAPER = "#fffdf9";
export const QR_WAX = "#9c4862";

// Exported separately so unit tests can verify scannability-critical settings
// without rendering a canvas.
export function styledQrOptions(data, size) {
  return {
    width: size,
    height: size,
    type: "canvas",
    data,
    image: SEAL,
    margin: Math.round(size * 0.05),
    // Error correction H: the centre seal hides up to 30% of modules
    qrOptions: { errorCorrectionLevel: "H" },
    imageOptions: { margin: Math.round(size * 0.015), imageSize: 0.3 },
    // square modules = printed, like the rest of the card (round dots read
    // as an app QR)
    dotsOptions: { type: "square", color: QR_INK },
    cornersSquareOptions: { type: "square", color: QR_INK },
    cornersDotOptions: { type: "square", color: QR_WAX },
    backgroundOptions: { color: QR_PAPER },
  };
}

// Render to a PNG data URL. Returns null on failure — callers pick their own
// fallback (e.g. the old api.qrserver.com URL) so a QR always appears.
export async function qrDataUrl(data, size = 280) {
  try {
    const qr = new QRCodeStyling(styledQrOptions(data, size));
    const blob = await qr.getRawData("png");
    if (!blob) return null;
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
