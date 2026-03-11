import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        home: resolve(__dirname, "index.html"),
        checkin: resolve(__dirname, "checkin/index.html"),
        capture: resolve(__dirname, "capture/index.html"),
        edit: resolve(__dirname, "edit/index.html"),
        detail: resolve(__dirname, "edit/detail.html"),
      },
    },
  },
});
