#!/usr/bin/env bun
import { widgetBuildConfig, type WidgetBuildOptions } from "@bundlehive/build";

/**
 * The `bundlehive` CLI. Wraps Vite with the widget build preset so authors
 * don't hand-write `vite.config.ts`.
 *
 *   bundlehive dev    [--entry src/embed.ts] [--port 5173]
 *   bundlehive build  [--entry src/embed.ts] [--name AcmeWidget] [--external react,react-dom]
 *
 * Spike note: the bin runs under Bun (it imports TS sources directly). A
 * published build will ship compiled JS so it runs under plain Node too.
 */

type Flags = Record<string, string | boolean>;

function parseFlags(argv: string[]): Flags {
  const flags: Flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg || !arg.startsWith("--")) continue;
    const eq = arg.indexOf("=");
    if (eq !== -1) {
      flags[arg.slice(2, eq)] = arg.slice(eq + 1);
    } else {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        flags[arg.slice(2)] = next;
        i++;
      } else {
        flags[arg.slice(2)] = true;
      }
    }
  }
  return flags;
}

function str(v: string | boolean | undefined): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function help(): void {
  console.log(`bundlehive — build standalone embeddable widgets

Usage:
  bundlehive dev     Start the dev server (HMR playground)
  bundlehive build   Build the embed bundle (IIFE + ESM) into dist/

Options:
  --entry <path>     Embed entry module        (default: src/embed.ts)
  --name <Name>      IIFE global name           (default: BundleHiveWidget)
  --external <list>  Comma-separated externals  (e.g. react,react-dom)
  --outDir <dir>     Output directory           (default: dist)
  --port <n>         Dev server port
`);
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  const flags = parseFlags(rest);
  const root = process.cwd();

  const baseOptions: WidgetBuildOptions = {
    root,
    entry: str(flags.entry),
    name: str(flags.name),
    outDir: str(flags.outDir),
    external: str(flags.external)?.split(",").map((s) => s.trim()),
  };

  // Imported lazily so `bundlehive --help` doesn't pay Vite's load cost.
  const { build, createServer } = await import("vite");

  if (command === "build") {
    await build({ configFile: false, ...widgetBuildConfig(baseOptions) });
    return;
  }

  if (command === "dev") {
    const port = str(flags.port);
    const server = await createServer({
      configFile: false,
      ...widgetBuildConfig({ ...baseOptions, dev: true }),
      server: port ? { port: Number(port) } : {},
    });
    await server.listen();
    server.printUrls();
    return;
  }

  help();
  if (command && command !== "help" && command !== "--help") {
    console.error(`\nUnknown command: ${command}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
