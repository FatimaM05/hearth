"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

type ItemSummary = { id: string; title: string; status: string };

const STORAGE_KEY = "hearth_seen_order_statuses";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function getSnapshot() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "{}";
  } catch {
    return "{}";
  }
}

export default function OrderStatusNotice({ items }: { items: ItemSummary[] }) {
  const seenJson = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const updates = useMemo(() => {
    if (seenJson === null || items.length === 0) return [];
    let prev: Record<string, string> = {};
    try {
      prev = JSON.parse(seenJson) as Record<string, string>;
    } catch {
      prev = {};
    }
    return items.filter((item) => {
      const oldStatus = prev[item.id];
      if (oldStatus) return oldStatus !== item.status;
      return item.status !== "new";
    });
  }, [items, seenJson]);

  const dismiss = useCallback(() => {
    let prev: Record<string, string> = {};
    try {
      prev = JSON.parse(getSnapshot()) as Record<string, string>;
    } catch {
      prev = {};
    }
    const nextMap: Record<string, string> = { ...prev };
    for (const item of items) nextMap[item.id] = item.status;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextMap));
    } catch {
      // Ignore storage quota errors
    }
    listeners.forEach((cb) => cb());
  }, [items]);

  if (updates.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink p-4 text-mist shadow-sm"
    >
      <div className="space-y-0.5 text-sm">
        <div className="flex items-center gap-2 font-display font-bold text-glow">
          <span className="size-2 rounded-full bg-glow" />
          Order status updated
        </div>
        <p className="text-xs text-mist/85">
          {updates.map((u) => `${u.title} is now ${u.status}`).join(" · ")}
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="min-h-9 cursor-pointer rounded-xl bg-white/10 px-3 text-xs font-semibold text-mist transition hover:bg-white/20"
      >
        Dismiss
      </button>
    </div>
  );
}
