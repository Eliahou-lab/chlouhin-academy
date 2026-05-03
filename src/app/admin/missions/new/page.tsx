import { NewMissionForm } from "@/components/new-mission-form";
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
          <NewMissionForm adminSecret={adminSecret} />
        </Card>
      </div>
    </PageShell>
  );
}
