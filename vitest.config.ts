import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/haven_test";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "server-only": path.resolve(import.meta.dirname, "./tests/mocks/server-only.ts"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    // Component tests opt into jsdom with a `// @vitest-environment jsdom` docblock.
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Integration tests share one database; keep files sequential to avoid cross-talk.
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: TEST_DATABASE_URL,
      AUTH_SECRET: "test-secret-test-secret-test-secret-1234",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      STORAGE_DRIVER: "local",
      STORAGE_LOCAL_DIR: "./storage-test",
      EMAIL_DRIVER: "console",
    },
  },
});
