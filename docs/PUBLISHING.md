# Publishing BundleHive to npm (GitHub Actions)

How the `@usereq/bundlehive*` framework packages get released. This is about publishing
**the framework itself** (`@usereq/bundlehive`, `@usereq/bundlehive-build`,
`@usereq/bundlehive-cli`) — not about a
widget author publishing their own widget (that's `.claude/skills/bundlehive-widget/references/publishing.md`).

---

## Decision: public npm registry, not GitHub Packages

Publish to the **public npm registry (npmjs.com)**. Reasoning:

- **CDN delivery depends on it.** unpkg and jsDelivr — the whole point of the
  `<script src="https://unpkg.com/…">` embed story — serve packages from
  **npmjs.com only**. They do **not** serve GitHub Packages.
- **Frictionless install.** A public npm package installs with no auth. A
  *public* GitHub Packages package still requires consumers to add a scoped
  `.npmrc` and a `GITHUB_TOKEN` just to `npm install` — a real adoption tax for
  an OSS framework.

GitHub Packages makes sense for *private* org-internal packages. BundleHive is
public OSS, so npmjs.com is correct. You can **optionally mirror** to GitHub
Packages (see the last section), but treat npm as the source of truth.

---

## Prerequisites

> ✅ **Build step + Changesets are set up.** All three packages build with `tsup`
> (`bun run build` → `dist/*.js` + `.d.ts`), `main`/`module`/`types`/`exports`/`files`
> point at `dist`, the CLI bin is `dist/cli.js` with a Node shebang, versions
> are `0.1.0`, and `npm pack --dry-run` ships `dist` only (no `src`). Changesets is
> initialized (`.changeset/config.json` — `access: public`, the three framework
> packages `fixed` to one version, examples ignored) and the root `changeset` /
> `version` / `release` scripts exist. **The only thing left is an account step:**
> the `@usereq` npm scope (already owned — same scope as `@usereq/widget`) needs an
> **`NPM_TOKEN`** automation token added as a repo secret. The subsections below
> document how this is wired up.

### 1. Add a build to each package (`tsup`)

`tsup` compiles TS → JS + `.d.ts` in one step; deps are externalized by default.

```bash
bun add -D tsup   # at the repo root (shared) or per package
```

`packages/react/tsup.config.ts` (and analogous for build/cli):

```ts
import { defineConfig } from "tsup";
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],          // framework packages are ESM
  dts: true,                // emit .d.ts
  clean: true,
  // react/react-dom (react pkg) and vite/@tailwindcss/vite (build/cli) are
  // deps → tsup leaves them external automatically.
});
```

For the **CLI**, the entry is the bin and it needs a Node shebang:

```ts
// packages/cli/tsup.config.ts
import { defineConfig } from "tsup";
export default defineConfig({
  entry: { cli: "src/cli.ts" },
  format: ["esm"],
  dts: false,
  clean: true,
  banner: { js: "#!/usr/bin/env node" },  // replaces the dev-only bun shebang
});
```

### 2. Repoint every package.json at `dist`

```jsonc
{
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
  "files": ["dist"],
  "scripts": { "build": "tsup", "prepublishOnly": "tsup" },
  // CLI only:
  "bin": { "bundlehive": "./dist/cli.js" }
}
```

Add a root `"build"` script that builds all packages, e.g.
`"build": "bun --filter './packages/*' build"`.

### 3. Version bumping & `workspace:*`

`@usereq/bundlehive-cli` depends on `@usereq/bundlehive-build` via `workspace:*`. npm doesn't
understand that protocol — it must become a real range (`^0.1.0`) at publish
time. **Changesets handles this automatically** (recommended below); `bun publish`
also rewrites `workspace:*`. Don't publish with plain `npm publish` from the
workspace without one of these.

### 4. npm scope + token

- The `@usereq` scope already exists on npmjs.com (it's where `@usereq/widget`
  lives) — no new scope to create. Make sure your publishing account can publish
  to it.
- Every package already has `"publishConfig": { "access": "public" }`.
- Create an **automation access token** (npm → Access Tokens → Granular, scoped
  to the `@usereq` packages, "Automation" type so it bypasses 2FA in CI).
- Add it to the GitHub repo as the secret **`NPM_TOKEN`**
  (Settings → Secrets and variables → Actions).

---

## Release flow: Changesets (recommended)

[Changesets](https://github.com/changesets/changesets) is the standard for
monorepo npm releases: contributors describe changes, it computes versions +
changelogs, opens a "Version Packages" PR, and publishes on merge.

### Setup — ✅ already done

`bunx changeset init` has been run and `.changeset/config.json` configured:

```jsonc
{
  "access": "public",
  "baseBranch": "main",
  // the three framework packages always share one version:
  "fixed": [["@usereq/bundlehive", "@usereq/bundlehive-build", "@usereq/bundlehive-cli"]],
  // private examples never version/publish:
  "ignore": [
    "@usereq/bundlehive-example-counter",
    "@usereq/bundlehive-example-floating-badge",
    "@usereq/bundlehive-example-loader-chat"
  ]
}
```

Root scripts `changeset` / `version` (`changeset version`) / `release`
(`changeset publish`) are in `package.json`, and `@changesets/cli` is a dev
dependency.

### First release (0.1.0)

The packages are at `0.1.0` and there are **no pending changesets**. When this
lands on `main` with `NPM_TOKEN` set, `changesets/action` sees nothing to version
and runs `publish` directly — shipping `0.1.0` to npm as-is. (No initial
changeset is needed; changesets publishes any package whose version isn't yet on
the registry.)

### Day-to-day (every change after 0.1.0)

For each change that should ship, run `bun run changeset`, pick the bump type
(patch/minor/major — one entry covers all three since they're `fixed`), and
commit the generated markdown file. On `main`, the workflow opens a "Version
Packages" PR; merging it publishes the bumped version.

### The workflow

Committed at `.github/workflows/release.yml` (see that file). On every push to
`main` it: installs, builds, then either opens/updates the **Version Packages
PR** (if there are pending changesets) or **publishes** to npm (once that PR is
merged and versions are bumped).

Secrets/permissions it needs:
- `NPM_TOKEN` secret (above).
- `contents: write` + `pull-requests: write` (open the version PR / push tags).
- `id-token: write` for **npm provenance** (`NPM_CONFIG_PROVENANCE`), which
  cryptographically links the published package to this repo + commit. Requires
  a public repo and npm CLI ≥ 9.5.

---

## Alternative: tag-triggered publish (simplest)

If Changesets is more than you want, publish on a pushed tag. Bump versions
manually, then:

```bash
git tag v0.1.0 && git push origin v0.1.0
```

A minimal workflow (`on: push: tags: ['v*']`) that runs `bun install`,
`bun run build`, then `bun publish --access public` in each package. `bun publish`
rewrites `workspace:*` automatically. Downside: you own version coordination and
changelogs by hand. Fine to start; migrate to Changesets when contributors arrive.

---

## First release checklist

1. ✅ Prerequisites done (build step, dist fields, CLI node shebang, Changesets
   config).
2. `bun run build` produces `dist/` in all three packages; `dist/cli.js` starts
   with `#!/usr/bin/env node`.
3. Smoke-test a pack: `cd packages/react && npm pack --dry-run` → confirm only
   `dist/`, `package.json`, `README.md` are included (no `src`).
4. `@usereq` scope publish access confirmed; `NPM_TOKEN` secret set.
5. Push to `main` → with no pending changesets the workflow publishes `0.1.0`
   directly. (For later releases: `bun run changeset` → merge the "Version
   Packages" PR → workflow publishes the bump.)
7. Verify: `npm view @usereq/bundlehive`, and the CDN URL
   `https://unpkg.com/@usereq/bundlehive` resolves.

---

## Optional: also mirror to GitHub Packages

Only if you want a GitHub-hosted mirror. Add a second job that authenticates to
`npm.pkg.github.com` with the built-in `GITHUB_TOKEN` and re-publishes:

```yaml
  github-packages:
    needs: release
    runs-on: ubuntu-latest
    permissions: { contents: read, packages: write }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, registry-url: "https://npm.pkg.github.com", scope: "@usereq" }
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile && bun run build
      - run: |
          for p in packages/react packages/build packages/cli; do
            (cd "$p" && npm publish) || true
          done
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Remember: this mirror is **not** served by unpkg/jsDelivr and requires auth to
install, so it's supplementary — npmjs.com stays the primary registry.
