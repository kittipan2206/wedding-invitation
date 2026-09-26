import { describe, it, expect, vi, beforeEach } from "vitest";

// Fresh module per test — music.js keeps its player in module state
async function load() {
  vi.resetModules();
  return import("../../src/js/music.js");
}

describe("music autoplay + remembered mute", () => {
  let play;
  beforeEach(() => {
    document.body.innerHTML = `<button id="music-btn"></button>`;
    localStorage.clear();
    play = vi.fn(() => Promise.resolve());
    HTMLMediaElement.prototype.play = play;
    HTMLMediaElement.prototype.pause = vi.fn();
  });

  it("does not download the track before the first play", async () => {
    const { initMusic } = await load();
    const created = [];
    const Orig = window.Audio;
    window.Audio = class extends Orig {
      constructor(...a) {
        super(...a);
        created.push(this);
      }
    };
    try {
      initMusic();
    } finally {
      window.Audio = Orig;
    }
    expect(created).toHaveLength(1);
    expect(created[0].preload).toBe("none");
  });

  it("envelope tap starts the music", async () => {
    const { initMusic, autoplayMusic } = await load();
    initMusic();
    autoplayMusic();
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("does not autoplay once the guest has muted it", async () => {
    localStorage.setItem("music_muted", "1");
    const { initMusic, autoplayMusic } = await load();
    initMusic();
    autoplayMusic();
    expect(play).not.toHaveBeenCalled();
  });

  it("pausing remembers the mute; pressing play clears it", async () => {
    const { initMusic } = await load();
    initMusic();
    const btn = document.getElementById("music-btn");
    btn.click(); // play
    await vi.waitFor(() => expect(btn.classList.contains("is-playing")).toBe(true));
    btn.click(); // pause
    expect(localStorage.getItem("music_muted")).toBe("1");
    btn.click(); // play again
    expect(localStorage.getItem("music_muted")).toBeNull();
  });
});
