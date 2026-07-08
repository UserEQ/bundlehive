import { useState } from "react";
import { Portal, useWidget } from "@usereq/bundlehive";

export interface CounterConfig {
  /** Initial count (from the `start` attribute). */
  start?: string;
  /** Label shown above the count (from the `label` attribute). */
  label?: string;
  /** Accent color (from the hyphenated `accent-color` attribute). */
  accentColor?: string;
}

/**
 * A tiny embeddable counter. Exercises the three things the framework must
 * get right: Tailwind utility classes inside a shadow root, runtime config
 * from element attributes, and a `<Portal>` overlay that stays scoped.
 */
export function Counter() {
  const { config } = useWidget<CounterConfig>();
  const [count, setCount] = useState(() => Number(config.start ?? "0") || 0);
  const [showInfo, setShowInfo] = useState(false);
  const accent = config.accentColor;

  return (
    <div className="inline-flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 font-sans shadow-lg">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {config.label ?? "Count"}
      </span>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setCount((c) => c - 1)}
          className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-lg text-slate-700 transition hover:bg-slate-200 active:scale-95"
        >
          −
        </button>

        <span
          className="min-w-12 text-center text-3xl font-semibold tabular-nums text-indigo-600"
          style={accent ? { color: accent } : undefined}
        >
          {count}
        </span>

        <button
          type="button"
          onClick={() => setCount((c) => c + 1)}
          className="grid h-9 w-9 place-items-center rounded-full bg-indigo-600 text-lg text-white transition hover:bg-indigo-500 active:scale-95"
          style={accent ? { backgroundColor: accent } : undefined}
        >
          +
        </button>
      </div>

      <button
        type="button"
        onClick={() => setShowInfo(true)}
        className="text-xs font-medium text-indigo-600 underline-offset-2 hover:underline"
      >
        What is this?
      </button>

      {showInfo && (
        <Portal>
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4"
            onClick={() => setShowInfo(false)}
          >
            <div
              className="max-w-xs rounded-xl bg-white p-5 text-sm text-slate-700 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-semibold text-slate-900">BundleHive widget</p>
              <p className="mt-1">
                This counter is a standalone React component mounted in a shadow
                root. This dialog is rendered through <code>&lt;Portal&gt;</code>,
                so it escapes layout but stays styled and isolated.
              </p>
              <button
                type="button"
                onClick={() => setShowInfo(false)}
                className="mt-4 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
              >
                Got it
              </button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
