import type { WidgetDefinition, WidgetElement } from "./define-widget";
import { onDomReady } from "./dom-ready";

export interface CreateLoaderOptions {
  /** CSS selector for the container to inject the instance into. Default `body`. */
  target?: string;
}

/** The global command function the loader installs. Calling it dispatches a
 *  command; before the bundle loads, the inline stub queues calls instead. */
export interface LoaderApi {
  (command: string, ...args: unknown[]): void;
  /** Pending-command queue used by the inline stub before this loads. */
  q?: unknown[];
}

/**
 * Install a command-queue loader API on `globalThis[name]` for a widget.
 *
 * This is the Intercom/Segment/GA pattern: the customer pastes a tiny inline
 * stub that buffers calls into `window[name].q` until the async bundle loads;
 * this function then *drains that queue* and replaces the stub with the real
 * dispatcher. It lets the host page configure and control the widget before
 * the script has finished loading.
 *
 * Built-in commands:
 *   - `init` / `boot` `(config)` — create the singleton instance with config
 *     (a rich object, not just string attributes) and inject it into the page.
 *   - `update` `(config)` — merge new config into the live instance.
 *   - `destroy` — remove the instance.
 *   - anything else `(payload)` — delivered to the widget via
 *     `useWidgetCommands` (e.g. `open`, `close`, `toggle`).
 *
 * Inline stub for the customer (with `name = "acme"`):
 * ```html
 * <script>
 *   (function (w) { w.acme = w.acme || function () {
 *     (w.acme.q = w.acme.q || []).push(arguments); }; })(window);
 *   acme('init', { title: 'Support' });
 *   acme('open');
 * </script>
 * <script src="https://unpkg.com/your-widget" async></script>
 * ```
 */
export function createLoader(
  name: string,
  definition: WidgetDefinition,
  options: CreateLoaderOptions = {},
): void {
  if (typeof globalThis === "undefined") return;
  const glob = globalThis as Record<string, unknown>;
  const existing = glob[name] as LoaderApi | undefined;
  const queued: unknown[] =
    existing && Array.isArray(existing.q) ? existing.q : [];

  let element: WidgetElement | null = null;

  const container = (): ParentNode => {
    if (options.target) {
      const found = document.querySelector(options.target);
      if (found) return found;
    }
    return document.body;
  };

  const handleInit = (config?: unknown): void => {
    if (element) {
      if (config !== undefined) element.setConfig(config as never);
      return;
    }
    const el = document.createElement(definition.tag) as WidgetElement;
    if (config !== undefined) el.setConfig(config as never);
    element = el;
    onDomReady(() => container().appendChild(el));
  };

  const dispatch: LoaderApi = (command: string, ...args: unknown[]): void => {
    if (typeof command !== "string") return;
    switch (command) {
      case "init":
      case "boot":
        handleInit(args[0]);
        break;
      case "update":
        if (element) element.setConfig(args[0] as never);
        else handleInit(args[0]);
        break;
      case "destroy":
        if (element) {
          element.remove();
          element = null;
        }
        break;
      default:
        if (element) {
          element.sendCommand(command, args[0]);
        } else {
          console.warn(
            `[bundlehive] ${name}("${command}") ignored — call ` +
              `${name}("init", …) before sending commands.`,
          );
        }
    }
  };

  glob[name] = dispatch;

  // Replay anything the inline stub queued before we loaded.
  for (const entry of queued) {
    const argv = Array.from(entry as ArrayLike<unknown>);
    dispatch(argv[0] as string, ...argv.slice(1));
  }
}
