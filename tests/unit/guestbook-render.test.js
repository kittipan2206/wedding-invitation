import { describe, it, expect, beforeEach } from "vitest";
import { escHtml, makeEntryEl, renderFeed } from "../../src/js/guestbook.js";

// ─── escHtml ──────────────────────────────────────────────────────────────────

describe("guestbook escHtml", () => {
  it("escapes & < > \" characters", () => {
    expect(escHtml('A & B')).toBe("A &amp; B");
    expect(escHtml("<script>")).toBe("&lt;script&gt;");
    expect(escHtml('"quoted"')).toBe("&quot;quoted&quot;");
  });

  it("leaves plain Thai text unchanged", () => {
    expect(escHtml("สวัสดีครับ")).toBe("สวัสดีครับ");
  });

  it("converts non-string inputs via String()", () => {
    expect(escHtml(42)).toBe("42");
    expect(escHtml(null)).toBe("null");
  });

  it("handles XSS payload", () => {
    const result = escHtml('<script>alert("xss")</script>');
    expect(result).not.toContain("<script>");
    expect(result).toContain("&lt;script&gt;");
  });
});

// ─── makeEntryEl ─────────────────────────────────────────────────────────────

describe("guestbook makeEntryEl", () => {
  it("returns a div element", () => {
    const el = makeEntryEl({ name: "สมชาย", message: "ขอให้มีความสุข" });
    expect(el.tagName).toBe("DIV");
    expect(el.className).toContain("gb-entry");
  });

  it("renders name and message text content", () => {
    const el = makeEntryEl({ name: "แขก", message: "ยินดีด้วย" });
    expect(el.textContent).toContain("แขก");
    expect(el.textContent).toContain("ยินดีด้วย");
  });

  it("uses first character of name as avatar", () => {
    const el = makeEntryEl({ name: "นนท์", message: "ข้อความ" });
    const avatar = el.querySelector(".gb-entry-avatar");
    expect(avatar?.textContent?.trim()).toBe("น");
  });

  it("uses ♡ as avatar fallback when name is empty", () => {
    const el = makeEntryEl({ name: "", message: "ข้อความ" });
    const avatar = el.querySelector(".gb-entry-avatar");
    expect(avatar?.textContent?.trim()).toBe("♡");
  });

  it("escapes HTML special chars in name and message", () => {
    const el = makeEntryEl({ name: "<b>evil</b>", message: '<img src=x onerror="alert(1)">' });
    expect(el.innerHTML).not.toContain("<b>evil</b>");
    expect(el.innerHTML).not.toContain("<img");
  });

  it("renders emoji in message correctly", () => {
    const el = makeEntryEl({ name: "ผู้ส่ง", message: "ขอบคุณ ♡ 🎉" });
    expect(el.textContent).toContain("🎉");
  });
});

// ─── renderFeed ──────────────────────────────────────────────────────────────

describe("guestbook renderFeed", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="guestbook-feed"></div>
      <button id="gb-show-more" style="display:none">ดูเพิ่ม</button>`;
  });

  it("renders entries in the feed element", () => {
    renderFeed([
      { name: "แขกคนแรก", message: "ขอให้มีความสุข" },
      { name: "แขกคนสอง", message: "สวัสดีครับ" },
    ]);
    expect(document.getElementById("guestbook-feed").textContent).toContain("แขกคนแรก");
    expect(document.getElementById("guestbook-feed").textContent).toContain("แขกคนสอง");
  });

  it("clears feed and hides show-more when entries is empty", () => {
    renderFeed([]);
    expect(document.getElementById("guestbook-feed").innerHTML).toBe("");
    expect(document.getElementById("gb-show-more").style.display).toBe("none");
  });

  it("shows only up to 5 entries initially (FEED_LIMIT)", () => {
    const entries = Array.from({ length: 8 }, (_, i) => ({
      name: `แขก ${i + 1}`,
      message: `ข้อความ ${i + 1}`,
    }));
    renderFeed(entries);
    expect(document.querySelectorAll(".gb-entry")).toHaveLength(5);
  });

  it("shows 'show more' button when entries exceed FEED_LIMIT", () => {
    const entries = Array.from({ length: 6 }, (_, i) => ({
      name: `แขก ${i + 1}`,
      message: `ข้อความ ${i + 1}`,
    }));
    renderFeed(entries);
    expect(document.getElementById("gb-show-more").style.display).toBe("block");
  });

  it("hides 'show more' button when entries are within FEED_LIMIT", () => {
    renderFeed([
      { name: "แขก 1", message: "ข้อความ" },
      { name: "แขก 2", message: "ข้อความ" },
    ]);
    expect(document.getElementById("gb-show-more").style.display).toBe("none");
  });

  it("handles null/undefined entries gracefully (no crash)", () => {
    expect(() => renderFeed(null)).not.toThrow();
    expect(() => renderFeed(undefined)).not.toThrow();
  });
});
