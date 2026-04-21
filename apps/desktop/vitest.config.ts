import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "scripts/**/*.test.mjs"],
    environment: "node",
    pool: "threads",
    maxWorkers: 1,
    passWithNoTests: true,
  },
});
