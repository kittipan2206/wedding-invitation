// Styled QR generator — shared by the venue display and the digital card.
// Rendered locally so nothing depends on a third-party QR service being
// reachable at the venue, and card exports never hit canvas-taint issues
// (data: URLs are same-origin for html2canvas).
import QRCodeStyling from "qr-code-styling";

// Heart mark in the QR centre — inline data URI, no network fetch.
const HEART_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
      '<path fill="#d4537e" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>' +
      "</svg>",
  );

// Exported separately so unit tests can verify scannability-critical settings
// without rendering a canvas.
export function styledQrOptions(data, size) {
  return {
    width: size,
    height: size,
    type: "canvas",
    data,
    image: HEART_SVG,
    margin: Math.round(size * 0.04),
    // Error correction H: the centre logo hides up to 30% of modules
    qrOptions: { errorCorrectionLevel: "H" },
    imageOptions: { margin: Math.round(size * 0.02), imageSize: 0.3 },
    // Data modules stay near-black for scanner contrast; only the corner
    // finder patterns take the theme's rose accent.
    dotsOptions: { type: "rounded", color: "#2e2a28" },
    cornersSquareOptions: { type: "extra-rounded", color: "#c44469" },
    cornersDotOptions: { type: "dot", color: "#c44469" },
    backgroundOptions: { color: "#ffffff" },
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
