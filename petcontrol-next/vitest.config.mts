import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    // Fase Setup ainda não tem testes; remover quando US1 criar o primeiro.
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      include: ["lib/domain/data-local.ts"],
      thresholds: { lines: 100, functions: 100 },
    },
  },
});
