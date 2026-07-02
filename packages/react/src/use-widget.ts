import { useContext, useEffect, useRef, useSyncExternalStore } from "react";
import {
  WidgetContext,
  type WidgetCommand,
  type WidgetController,
} from "./host";

export interface WidgetHandle<Config> {
  /** Live config parsed from the element's attributes / runtime init. */
  config: Config;
  /** The host custom element. */
  element: HTMLElement;
  /** The shadow root the widget renders into (use for portals). */
  shadowRoot: ShadowRoot;
}

/**
 * Read the widget's runtime config and host handle from inside a component
 * rendered by `defineWidget`. Re-renders when observed attributes change.
 *
 * The generic is the config shape you declared via `parseConfig` (or the
 * default `Record<string, string | null>` of raw attributes).
 */
export function useWidget<Config = Record<string, string | null>>(): WidgetHandle<Config> {
  const controller = useContext(WidgetContext) as WidgetController<Config> | null;
  if (!controller) {
    throw new Error(
      "[bundlehive] useWidget() was called outside a widget. Components " +
        "must be rendered by defineWidget() to access the host.",
    );
  }

  const config = useSyncExternalStore(
    controller.subscribe,
    controller.getConfig,
    controller.getConfig,
  );

  return {
    config,
    element: controller.element,
    shadowRoot: controller.shadowRoot,
  };
}

/**
 * Handle imperative commands sent through the loader API (e.g. `acme('open')`).
 * The handler always sees the latest closure; commands fired before mount are
 * buffered and delivered once this subscribes.
 *
 * ```tsx
 * useWidgetCommands((cmd) => {
 *   if (cmd.type === "open") setOpen(true);
 *   if (cmd.type === "close") setOpen(false);
 * });
 * ```
 */
export function useWidgetCommands(
  handler: (command: WidgetCommand) => void,
): void {
  const controller = useContext(WidgetContext);
  if (!controller) {
    throw new Error(
      "[bundlehive] useWidgetCommands() was called outside a widget.",
    );
  }

  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(
    () => controller.onCommand((command) => handlerRef.current(command)),
    [controller],
  );
}
