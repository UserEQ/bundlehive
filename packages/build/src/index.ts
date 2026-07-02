import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import type { LibraryFormats, UserConfig } from "vite";

export interface WidgetBuildOptions {
  /** Project root. Default: `process.cwd()`. */
  root?: string;
  /** Embed entry module (the one that calls `defineWidget`). Default `src/embed.ts`. */
  entry?: string;
  /** Global variable name for the IIFE bundle. Default `BundleHiveWidget`. */
  name?: string;
  /** Output formats. Default `["iife", "es"]` (CDN `<script>` + npm import). */
  formats?: LibraryFormats[];
  /** Output directory. Default `dist`. */
  outDir?: string;
  /** Base file name (extension is chosen per format). Default `embed`. */
  fileName?: string;
  /**
   * Modules to leave un-bundled. Pass `["react", "react-dom"]` to build the
   * shared-runtime / npm variant where the host provides React. Default `[]`
   * (standalone bundle with React included).
   */
  external?: string[];
  /** IIFE global mappings for externalized modules, e.g. `{ react: "React" }`. */
  globals?: Record<string, string>;
  /** Dev mode — keeps `process.env.NODE_ENV` as development for HMR. */
  dev?: boolean;
}

/**
 * Build the Vite config for a BundleHive widget. This is the opinionated
 * preset the CLI uses; authors can also drop it into a `vite.config.ts`:
 *
 * ```ts
 * import { defineConfig } from "vite";
 * import { widgetBuildConfig } from "@bundlehive/build";
 * export default defineConfig(widgetBuildConfig({ name: "AcmeWidget" }));
 * ```
 *
 * Notes:
 * - Vite 8 is rolldown/oxc-based; we deliberately avoid `esbuild`/`minify:'esbuild'`
 *   options (they force the deprecated esbuild path). JSX comes from tsconfig.
 * - `cssCodeSplit: false` because widget CSS is imported `?inline` and adopted
 *   into the shadow root at runtime, not emitted as a separate stylesheet.
 */
export function widgetBuildConfig(options: WidgetBuildOptions = {}): UserConfig {
  const root = options.root ?? process.cwd();
  const entry = resolve(root, options.entry ?? "src/embed.ts");
  const formats = options.formats ?? (["iife", "es"] as LibraryFormats[]);
  const base = options.fileName ?? "embed";
  const external = options.external ?? [];

  return {
    root,
    plugins: [tailwindcss()],
    build: {
      outDir: options.outDir ?? "dist",
      emptyOutDir: true,
      cssCodeSplit: false,
      lib: {
        entry,
        name: options.name ?? "BundleHiveWidget",
        formats,
        fileName: (format) =>
          format === "es"
            ? `${base}.mjs`
            : format === "iife"
              ? `${base}.js`
              : `${base}.${format}.js`,
      },
      rollupOptions:
        external.length > 0
          ? { external, output: { globals: options.globals ?? {} } }
          : undefined,
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify(
        options.dev ? "development" : "production",
      ),
    },
  };
}
