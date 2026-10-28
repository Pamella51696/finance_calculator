import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["packages/**/src/**/*.test.ts", "apps/**/src/**/*.test.ts"],
    pool: "forks",
  },
  resolve: {
    alias: {
      "@finance/core": path.resolve(__dirname, "packages/core/src/index.ts"),
      "@finance/db": path.resolve(__dirname, "packages/db/src/index.ts"),
    },
  },
});
