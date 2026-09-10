import { defineConfig } from "vitest/config";
import path from "node:path";

// Minimal, framework-agnostic unit-test runner for this project's pure
// business-logic functions (agent commission math, cancellation refund
// math -- see src/lib/**/*.test.ts). Deliberately does NOT boot Next.js
// or touch Supabase: those are exercised by hand against the real
// staging project, same as every other change in this app. This only
// needs to resolve the same "@/..." import alias the app code itself
// uses, so a test file can import straight from src/lib without a
// separate relative-path convention.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
