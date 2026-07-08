import { defineConfig } from "tsup";

// react/react-dom are peerDependencies → tsup leaves them external automatically.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  treeshake: true,
  sourcemap: true,
});
