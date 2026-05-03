import { defineConfig } from "vite";
import { readdirSync } from "fs";
import { join } from "path";

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

const GAS_URL =
  "https://script.google.com/macros/s/AKfycbx3xzXnYpTqjmhY7MjYrgQ03c_9TvtNgYtiP_afh9VbOTDt6E_8As_u32FSX7yKAoQG/exec";

export default defineConfig({
  plugins: [musicManifestPlugin()],
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
        "src/js/card-export.js",
      ],
      reporter: ["text", "html"],
      thresholds: { lines: 70, functions: 70 },
    },
  },
  server: {
    proxy: {
      "/api/upload-music": {
        target: GAS_URL,
        changeOrigin: true,
        rewrite: () => "",
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            proxyReq.setHeader("Content-Type", "application/json");
            if (req.body) {
              const body = JSON.stringify({ type: "music_upload", ...req.body });
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
