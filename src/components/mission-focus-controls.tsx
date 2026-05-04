"use client";

import { useEffect, useMemo, useState } from "react";

type FocusItem = {
  id: string;
  title: string;
  status: "locked" | "completed" | "submitted" | "rejected" | "active";
};

export function MissionFocusControls({ items }: { items: FocusItem[] }) {
  const firstActive = Math.max(0, items.findIndex((item) => item.status === "active" || item.status === "rejected" || item.status === "submitted"));
  const [focusEnabled, setFocusEnabled] = useState(false);
  const [index, setIndex] = useState(firstActive >= 0 ? firstActive : 0);
  const current = items[index];
  const safeItems = useMemo(() => items.filter(Boolean), [items]);

  useEffect(() => {
    document.querySelectorAll<HTMLElement>("[data-focus-block]").forEach((element) => {
      const visible = !focusEnabled || element.dataset.focusBlock === current?.id;
      element.classList.toggle("hidden", !visible);
    });
    if (focusEnabled && current) {
      window.requestAnimationFrame(() => document.getElementById(current.id)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    }
  }, [current, focusEnabled]);

  function goTo(nextIndex: number) {
    const bounded = Math.max(0, Math.min(safeItems.length - 1, nextIndex));
    setIndex(bounded);
    const target = safeItems[bounded];
    if (target) {
      window.requestAnimationFrame(() => document.getElementById(target.id)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    }
  }

  if (safeItems.length <= 1) return null;

  return (
    <div className="sticky top-20 z-30 rounded-xl border border-border bg-surface/95 p-3 shadow-xl backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Mode focus</p>
          <p className="font-display text-sm">{current ? `${index + 1}/${safeItems.length} · ${current.title}` : "Tous les blocs"}</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-md border border-border px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-white" onClick={() => setFocusEnabled((value) => !value)}>
            {focusEnabled ? "Tout afficher" : "Un bloc à la fois"}
          </button>
          <button className="rounded-md border border-border px-3 py-2 text-sm disabled:opacity-40" disabled={index === 0} onClick={() => goTo(index - 1)}>
            Étape précédente
          </button>
          <button className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-40" disabled={index >= safeItems.length - 1} onClick={() => goTo(index + 1)}>
            Étape suivante
          </button>
        </div>
      </div>
    </div>
  );
}
