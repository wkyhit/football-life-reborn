import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    clearMocks: true,
    environment: "happy-dom",
    exclude: [
      ...configDefaults.exclude,
      "tests/build/**",
      "tests/e2e/**",
      "tests/visual/**",
    ],
    restoreMocks: true,
    setupFiles: "./src/test/setup.ts",
  },
});
