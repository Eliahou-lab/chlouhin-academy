"use client";

import { useState, useTransition } from "react";

import { createMissionAction } from "@/app/actions/missions";

export function NewMissionForm({ adminSecret }: { adminSecret: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const response = await createMissionAction(formData);
      if (response && !response.ok) setError(response.error);
    });
  }

  return (
    <form action={submit} className="space-y-4">
      <input type="hidden" name="adminSecret" value={adminSecret} />
      <div className="grid gap-3 md:grid-cols-3">
        <Field name="code" label="Code" placeholder="F12" required />
        <Field name="title" label="Titre" placeholder="Nouvelle mission" required />
        <NumberField name="order_index" label="Ordre" defaultValue={12} />
      </div>
      <label className="space-y-2">
        <span className="text-sm text-muted">Persona</span>
        <select name="persona" className="h-11 w-full rounded-md border border-border bg-surface px-3">
          <option>Mendel</option>
          <option>Sarah</option>
          <option>Yossi</option>
          <option>Aucun</option>
        </select>
      </label>
      <label className="space-y-2">
        <span className="text-sm text-muted">Affichage élèves</span>
        <select name="display_mode" className="h-11 w-full rounded-md border border-border bg-surface px-3">
          <option value="all_visible">Tout visible</option>
          <option value="progressive">Révélation progressive</option>
          <option value="sections">Par sections / sous-tâches</option>
          <option value="free">Libre sans blocage</option>
        </select>
      </label>
      <label className="space-y-2">
        <span className="text-sm text-muted">Scénario persona</span>
        <textarea name="persona_scenario" className="min-h-24 w-full rounded-md border border-border bg-surface p-3" />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_locked" />
        Créer verrouillée
      </label>
      {error ? <p className="rounded-md border border-accent-red/40 bg-accent-red/10 p-3 text-sm text-accent-red">{error}</p> : null}
      <button className="rounded-md bg-primary px-4 py-2 font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60" disabled={isPending}>
        {isPending ? "Création..." : "Créer la mission"}
      </button>
    </form>
  );
}

function Field({ name, label, placeholder, required = false }: { name: string; label: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="space-y-2">
      <span className="text-sm text-muted">{label}</span>
      <input required={required} name={name} placeholder={placeholder} className="h-11 w-full rounded-md border border-border bg-surface px-3" />
    </label>
  );
}

function NumberField({ name, label, defaultValue }: { name: string; label: string; defaultValue: number }) {
  return (
    <label className="space-y-2">
      <span className="text-sm text-muted">{label}</span>
      <input name={name} type="number" defaultValue={defaultValue} className="h-11 w-full rounded-md border border-border bg-surface px-3" />
    </label>
  );
}
