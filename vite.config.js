import { defineConfig } from "vite";
import { copyFileSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { renderPage } from "./api/og.js";
import { CONFIG_DEFAULTS, validateConfig } from "./src/js/config.js";

function musicManifestPlugin() {
  return {
    name: "music-manifest",
    config() {
      const dir = join(process.cwd(), "public", "music");
      let files = [];
      try {
        files = readdirSync(dir)
          .filter((f) => /\.(mp3|wav|ogg|m4a|flac)$/i.test(f))
          .map((f) => ({
            label: f.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
            url: `/music/${f}`,
          }));
      } catch {}
      return { define: { __LOCAL_MUSIC__: JSON.stringify(files) } };
    },
  };
}

// dist/_template.html keeps the {{og_*}} placeholders for api/og.js; the
// static dist/index.html gets them filled from the defaults, so a host that
// can't run api/og.js (Cloudflare Pages) still shows a proper link preview
function staticOgPlugin() {
  return {
    name: "static-og",
    apply: "build",
    closeBundle() {
      const index = join(process.cwd(), "dist", "index.html");
      copyFileSync(index, join(process.cwd(), "dist", "_template.html"));
      const cfg = validateConfig(CONFIG_DEFAULTS);
      writeFileSync(index, renderPage(readFileSync(index, "utf-8"), cfg));
    },
  };
}

const GAS_URL =
  "https://script.google.com/macros/s/AKfycbx3xzXnYpTqjmhY7MjYrgQ03c_9TvtNgYtiP_afh9VbOTDt6E_8As_u32FSX7yKAoQG/exec";

export default defineConfig({
  plugins: [musicManifestPlugin(), staticOgPlugin()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.js"],
    include: ["tests/unit/**/*.test.js"],
    define: {
      __LOCAL_MUSIC__: JSON.stringify([]),
    },
    coverage: {
      provider: "v8",
      include: ["src/js/**/*.js"],
      exclude: [
        "src/js/music.js",
        "src/js/petals.js",
        "src/js/cursor-sparkle.js",
        "src/js/confetti.js",
        "src/js/parallax.js",
        "src/js/scroll-nav.js",
        "src/js/reveal.js",
        "src/js/fullscreen.js",
        "src/js/send-invites.js",
        // Covered by Playwright E2E, not unit tests
        "src/js/gallery.js",
        "src/js/display.js",
        "src/js/envelope.js",
        "src/js/share.js",
        "src/js/main.js",
        "src/js/qr.js",
        "src/js/rsvp-send-anim.js",
        "src/js/gb-composer-anim.js",
      ],
      reporter: ["text", "html"],
      thresholds: { lines: 60, functions: 60 },
    },
  },
  server: {
    // Tooling (e.g. preview harness) can assign a port via PORT; default 5173
    port: Number(process.env.PORT) || 5173,
    proxy: {
      "/api/upload-music": {
        target: GAS_URL,
        changeOrigin: true,
        rewrite: () => "",
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            proxyReq.setHeader("Content-Type", "application/json");
            if (req.body) {
              const body = JSON.stringify({
                type: "music_upload",
                ...req.body,
              });
              proxyReq.setHeader("Content-Length", Buffer.byteLength(body));
              proxyReq.write(body);
            }
          });
        },
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: "./index.html",
        card: "./card.html",
        display: "./display.html",
        gallery: "./gallery.html",
        admin: "./admin.html",
      },
    },
  },
  base: "./",
});
