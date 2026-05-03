import { createExerciseAction } from "@/app/actions/exercises";
import { Card, PageShell } from "@/components/ui";

export default function NewExercisePage() {
  const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "";

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="border-b border-border pb-5">
          <h1 className="font-display text-4xl font-bold">Nouvel exercice bonus</h1>
          <p className="mt-2 text-muted">Création rapide, activation immédiate optionnelle.</p>
        </header>

        <Card>
          <form action={createExerciseAction} className="space-y-4">
            <input type="hidden" name="adminSecret" value={adminSecret} />
            <Field name="title" label="Titre" required />
            <Area name="description" label="Description" required />
            <label className="space-y-2">
              <span className="text-sm text-muted">Type</span>
              <select name="type" className="h-11 w-full rounded-md border border-border bg-surface px-3">
                <option value="find_api">Find API</option>
                <option value="debug">Debug</option>
                <option value="quiz">Quiz</option>
                <option value="screenshot">Screenshot</option>
                <option value="url">URL</option>
              </select>
            </label>
            <Field name="correct_answer" label="Réponse correcte" />
            <div className="grid gap-3 md:grid-cols-3">
              <NumberField name="points" label="Points" defaultValue={50} />
              <NumberField name="bonus_first" label="Bonus premier" defaultValue={20} />
              <label className="space-y-2">
                <span className="text-sm text-muted">Durée : 5 à 60 min</span>
                <input name="minutes" type="range" min={5} max={60} defaultValue={15} className="w-full accent-primary" />
              </label>
            </div>
            <Area name="hint" label="Indice optionnel" />
            <div className="flex flex-wrap gap-3">
              <button name="activate" value="false" className="rounded-md border border-border px-4 py-2 font-semibold hover:bg-surface-2">
                Créer sans activer
              </button>
              <button name="activate" value="true" className="rounded-md bg-primary px-4 py-2 font-semibold text-white hover:opacity-90">
                Créer et activer maintenant
              </button>
            </div>
          </form>
        </Card>
      </div>
    </PageShell>
  );
}

function Field({ name, label, required = false }: { name: string; label: string; required?: boolean }) {
  return (
    <label className="space-y-2">
      <span className="text-sm text-muted">{label}</span>
      <input required={required} name={name} className="h-11 w-full rounded-md border border-border bg-surface px-3" />
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

function Area({ name, label, required = false }: { name: string; label: string; required?: boolean }) {
  return (
    <label className="space-y-2">
      <span className="text-sm text-muted">{label}</span>
      <textarea required={required} name={name} className="min-h-28 w-full rounded-md border border-border bg-surface p-3" />
    </label>
  );
}
