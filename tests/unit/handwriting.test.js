import { describe, it, expect } from "vitest";
import { thin, trace } from "../../src/js/handwriting.js";

// Binary grid helper: rows of "#"/"."
function grid(rows) {
  const h = rows.length;
  const w = rows[0].length;
  const img = new Uint8Array(w * h);
  rows.forEach((r, y) => [...r].forEach((c, x) => (img[y * w + x] = c === "#" ? 1 : 0)));
  return { img, w, h };
}

describe("handwriting skeleton", () => {
  it("thins a thick bar to a one-pixel centre line traced as one stroke", () => {
    const { img, w, h } = grid([
      "............",
      ".##########.",
      ".##########.",
      ".##########.",
      "............",
    ]);
    const strokes = trace(thin(img, w, h), w, h);
    expect(strokes).toHaveLength(1);
    // centre line: every point sits on the middle row
    expect(strokes[0].every(([, y]) => y === 2)).toBe(true);
    expect(strokes[0].length).toBeGreaterThanOrEqual(6);
  });

  it("orders strokes left to right", () => {
    const { img, w, h } = grid([
      "..............",
      ".###......###.",
      ".###......###.",
      ".###......###.",
      ".###......###.",
      ".###......###.",
      "..............",
    ]);
    const strokes = trace(thin(img, w, h), w, h);
    expect(strokes.length).toBe(2);
    const minX = (s) => Math.min(...s.map((p) => p[0]));
    expect(minX(strokes[0])).toBeLessThan(minX(strokes[1]));
  });
});
