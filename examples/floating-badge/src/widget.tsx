import { useState } from "react";
import { useWidget } from "@bundlehive/react";

export interface BadgeConfig {
  label?: string;
  accentColor?: string;
}

/**
 * A floating launcher — the "just load the script" pattern. There is no
 * placed element on the page; `autoMount` injects this into <body>, and it
 * pins itself to the bottom-right corner (fixed positioning works inside the
 * shadow root, relative to the viewport).
 */
export function FloatingBadge() {
  const { config } = useWidget<BadgeConfig>();
  const [open, setOpen] = useState(false);
  const accent = config.accentColor ?? "#4f46e5";

  return (
    <div className="fixed bottom-5 right-5 z-[2147483647] flex flex-col items-end gap-3 font-sans">
      {open && (
        <div className="w-64 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-2xl">
          <p className="font-semibold text-slate-900">
            {config.label ?? "Need a hand?"}
          </p>
          <p className="mt-1">
            This launcher was injected by the embed script alone — no element on
            the page. It lives in a shadow root, so the host CSS can't touch it.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open chat"
        className="grid h-14 w-14 place-items-center rounded-full text-white shadow-xl transition hover:brightness-110 active:scale-95"
        style={{ backgroundColor: accent }}
      >
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}
