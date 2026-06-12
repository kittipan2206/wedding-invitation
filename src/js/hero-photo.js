import { getSizedUrl } from "./gallery.js";

// Hero couple photo — arch-framed portrait above the names.
// Source priority: config hero_photo_url → first visible pre-wedding photo →
// first photo. No photo → hero keeps its floral illustration (no empty frame).

export function pickHeroPhoto(cfg, photos) {
  if (cfg?.hero_photo_url) return cfg.hero_photo_url;
  if (!Array.isArray(photos) || photos.length === 0) return null;
  const visible = photos.filter((p) => p.visible !== false && p.url);
  const pre = visible.find((p) => p.category === "pre-wedding");
  return (pre || visible[0])?.url || null;
}

export function setHeroPhoto(photos) {
  const wrap = document.querySelector(".hero-photo");
  const img = document.getElementById("hero-photo-img");
  const hero = document.getElementById("hero");
  if (!wrap || !img || !hero) return;

  const url = pickHeroPhoto(window.__weddingConfig, photos);
  if (!url) return;

  img.addEventListener(
    "load",
    () => {
      hero.classList.add("hero--photo");
      wrap.style.display = "flex";
    },
    { once: true },
  );
  img.src = getSizedUrl(url, 480);
}
