import { defineConfig } from "vitest/config";
import { alias } from "./build/utils";

export default defineConfig({
  resolve: {
    alias
  },
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{js,ts}"],
    globals: false
  }
});
