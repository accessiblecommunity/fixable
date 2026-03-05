import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      scripts: resolve(__dirname, "scripts"),
    },
  },
  test: {
    include: ["scripts/**/*.test.ts"],
    coverage: {
      include: ["scripts/**/*.ts"],
      exclude: ["scripts/**/*.test.ts"],
    },
  },
});
