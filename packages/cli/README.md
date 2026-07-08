# @usereq/bundlehive-cli

The `bundlehive` command — dev server and build for
[BundleHive](https://github.com/nguyenduy/bundlehive) embeddable widgets. No
`vite.config.ts` required; it applies the widget build preset internally.

```bash
npm install -D @usereq/bundlehive-cli
```

## Commands

```bash
bundlehive dev      # Vite dev server / HMR playground (serves index.html)
bundlehive build    # Build the embed bundle (IIFE + ESM) into dist/
```

## Options

| Flag | Default | Purpose |
| --- | --- | --- |
| `--entry <path>` | `src/embed.ts` | Embed entry module (the one calling `defineWidget`) |
| `--name <Name>` | `BundleHiveWidget` | Global name for the IIFE bundle |
| `--external <list>` | – | Comma-separated externals, e.g. `react,react-dom` |
| `--outDir <dir>` | `dist` | Output directory |
| `--port <n>` | Vite default | Dev server port |

## package.json

```json
{
  "scripts": {
    "dev": "bundlehive dev",
    "build": "bundlehive build --name AcmeWidget"
  }
}
```

Outputs `dist/embed.js` (IIFE, for `<script>`/CDN) and `dist/embed.mjs` (ESM, for
npm consumers). Pairs with [`@usereq/bundlehive`](https://www.npmjs.com/package/@usereq/bundlehive).

## License

MIT
