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
