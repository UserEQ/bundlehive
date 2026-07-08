import { defineConfig } from "tsup";

// vite + @tailwindcss/vite are dependencies → left external automatically.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
});
