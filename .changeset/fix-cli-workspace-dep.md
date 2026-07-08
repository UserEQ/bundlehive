---
"@usereq/bundlehive-cli": patch
---

Fix `install` failing in consumer projects. `@usereq/bundlehive-cli@0.1.0` was
published with `"@usereq/bundlehive-build": "workspace:*"` — the `workspace:`
protocol only resolves inside the framework's own monorepo, so `bun`/`npm`/`pnpm
install` rejected it everywhere else. The dependency is now pinned to a real
semver range (`^0.1.0`), which bun still links to the local package during
framework development but publishes as a resolvable range.
