import { createMissionAction } from "@/app/actions/missions";
import { Card, PageShell } from "@/components/ui";

export default function NewMissionPage() {
  const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "";

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="border-b border-border pb-5">
          <h1 className="font-display text-4xl font-bold">Créer une mission</h1>
          <p className="mt-2 text-muted">La mission sera créée vide, puis éditable avec les blocs flexibles.</p>
        </header>

        <Card>
          <form action={createMissionAction} className="space-y-4">
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
            <button className="rounded-md bg-primary px-4 py-2 font-semibold text-white hover:opacity-90">Créer la mission</button>
          </form>
        </Card>
      </div>
    </PageShell>
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
