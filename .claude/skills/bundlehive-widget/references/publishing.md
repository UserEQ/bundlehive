# Publishing a BundleHive widget to npm / CDN

The embed pattern `<script src="https://unpkg.com/<pkg>">` works because unpkg (and
jsDelivr) serve a package's files straight from npm, and resolve a bare URL to the
package's `unpkg` → `browser` → `main` field. Point those at the IIFE bundle.

## 1. Build

```bash
bundlehive build          # → dist/embed.js (IIFE) + dist/embed.mjs (ESM)
```

## 2. package.json fields

```jsonc
{
  "name": "@acme/support-widget",
  "version": "0.1.0",
  "unpkg": "./dist/embed.js",      // https://unpkg.com/@acme/support-widget → this
  "jsdelivr": "./dist/embed.js",
  "browser": "./dist/embed.js",
  "main": "./dist/embed.js",
  "module": "./dist/embed.mjs",    // for bundler/npm consumers
  "files": ["dist"],               // only ship the build output
  "publishConfig": { "access": "public" }  // for scoped public packages
}
```

## 3. Publish

```bash
npm publish        # or: bun publish
```

The bundle is then at:
- `https://unpkg.com/@acme/support-widget` (latest) or `@acme/support-widget@0.1.0`
- `https://cdn.jsdelivr.net/npm/@acme/support-widget`

## Versioning note

CDN URLs without a version pin resolve to `latest` — every publish updates every
embed immediately. For stability, tell customers to pin a major:
`https://unpkg.com/@acme/support-widget@1` (unpkg resolves semver ranges).

## Two different "publishes" — don't confuse them

- **You publishing a widget** (this doc): your widget package → npm → customers
  embed it. This is the common case.
- **Publishing the BundleHive framework itself** (`@usereq/bundlehive`, `/build`,
  `/cli`): only relevant if you maintain BundleHive. Those packages need a
  compile step (they currently ship TS source) before they're npm-ready — out of
  scope for widget authors.
