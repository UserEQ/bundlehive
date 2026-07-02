import { createContext } from "react";

/** An imperative command delivered to a widget through the loader API,
 *  e.g. `acme('open')` → `{ type: "open" }`. */
export interface WidgetCommand {
  type: string;
  payload?: unknown;
}

/**
 * The live handle a mounted widget has to its host custom element. One
 * controller exists per element instance; the React tree reads it through
 * `useWidget()`. It is an external store (`getSnapshot` + `subscribe`) so
 * attribute/config changes on the element re-render the React tree without
 * re-mounting it.
 */
export interface WidgetController<Config = Record<string, string | null>> {
  /** Current, parsed config. Recomputed whenever observed attributes change. */
  getConfig(): Config;
  /** Subscribe to config changes. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Subscribe to imperative commands from the loader API. Commands fired
   *  before the first subscriber are buffered and flushed on subscribe. */
  onCommand(listener: (command: WidgetCommand) => void): () => void;
  /** The host custom element. */
  readonly element: HTMLElement;
  /** The shadow root the widget renders into. Use for portals. */
  readonly shadowRoot: ShadowRoot;
}

export const WidgetContext = createContext<WidgetController<unknown> | null>(
  null,
);
