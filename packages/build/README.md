# @usereq/bundlehive-build

The Vite build preset behind [BundleHive](https://github.com/nguyenduy/bundlehive).
Most authors don't use this directly — the [`bundlehive`](https://www.npmjs.com/package/@usereq/bundlehive-cli)
CLI applies it for you. Reach for it only if you want an explicit `vite.config.ts`.

```bash
npm install -D @usereq/bundlehive-build vite
```

## Usage

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { widgetBuildConfig } from "@usereq/bundlehive-build";

export default defineConfig(widgetBuildConfig({ name: "AcmeWidget" }));
```

## `widgetBuildConfig(options)`

| Option | Default | Purpose |
| --- | --- | --- |
| `entry` | `src/embed.ts` | Embed entry module |
| `name` | `BundleHiveWidget` | IIFE global name |
| `formats` | `["iife", "es"]` | Library output formats |
| `outDir` | `dist` | Output directory |
| `fileName` | `embed` | Base filename (extension per format) |
| `external` | `[]` | Modules to leave unbundled (e.g. `["react","react-dom"]`) |
| `globals` | `{}` | IIFE globals for externals (e.g. `{ react: "React" }`) |
| `dev` | `false` | Keep `NODE_ENV=development` |

Sets up Tailwind (`@tailwindcss/vite`), library mode (IIFE + ESM), and
`cssCodeSplit: false` — widget CSS is imported `?inline` and adopted into the
shadow root at runtime, not emitted as a separate stylesheet.

> Note: BundleHive targets Vite 8 (rolldown/oxc). The preset deliberately avoids
> `esbuild`/`minify: 'esbuild'` options, which force the deprecated esbuild path.
> JSX comes from your tsconfig (`"jsx": "react-jsx"`).

## License

MIT
