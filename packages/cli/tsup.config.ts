import { defineConfig } from "tsup";

// The bin: compiled to dist/cli.js. The source's `#!/usr/bin/env node` shebang
// is preserved by tsup. @usereq/bundlehive-build + vite stay external (deps).
export default defineConfig({
  entry: { cli: "src/cli.ts" },
  format: ["esm"],
  dts: false,
  clean: true,
  sourcemap: true,
});
