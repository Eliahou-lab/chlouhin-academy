import Link from "next/link";

import { Badge, Card, EmptyState, PageShell } from "@/components/ui";
import { getAdminDashboardTeams, getBlockProgress, getBlocks, getExercises } from "@/lib/data";
import { teamMembersLabel } from "@/lib/teams";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [teams, blocks, progress, exercises] = await Promise.all([getAdminDashboardTeams(), getBlocks(), getBlockProgress(), getExercises()]);
  const pending = progress.filter((item) => item.status === "submitted");
  const activeExercise = exercises.find((exercise) => exercise.is_active);

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <h1 className="font-display text-3xl font-bold">Admin formateur</h1>
          <nav className="flex gap-3 text-sm text-muted">
	            <Link href="/admin/validate">Validation</Link>
	            <Link href="/admin/live">Live classe</Link>
	            <Link href="/admin/teams">Équipes</Link>
	            <Link href="/admin/missions">Missions</Link>
	            <Link href="/admin/exercise/new">Nouvel exercice</Link>
	            <Link href="/admin/display">Display</Link>
          </nav>
        </header>

        {teams.length === 0 ? <EmptyState title="Aucune equipe Supabase" /> : null}

        <section className="grid gap-4 md:grid-cols-4">
          <Link href="/admin/teams">
            <Card className="h-full transition hover:border-primary">
              <p className="text-sm text-muted">Equipes</p>
              <p className="font-display text-4xl">{teams.length}</p>
              <p className="mt-2 text-xs text-primary">Créer / modifier les équipes</p>
            </Card>
          </Link>
          <Card><p className="text-sm text-muted">Blocs cours</p><p className="font-display text-4xl">{blocks.length}</p></Card>
          <Card><p className="text-sm text-muted">Soumissions</p><p className="font-display text-4xl text-accent-yellow">{pending.length}</p></Card>
          <Card><p className="text-sm text-muted">Exercice actif</p><p className="font-display text-lg">{activeExercise?.title ?? "Aucun"}</p></Card>
        </section>

        <section className="grid gap-3">
          {teams.map((team) => (
            <Card key={team.id} className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold">{team.avatar_emoji ?? "🚀"} {team.name}</h2>
                <p className="text-sm text-muted">{teamMembersLabel(team)}</p>
                <p className="mt-1 text-sm text-primary">{team.activeMission}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="green">{team.total_score ?? 0} pts</Badge>
                <Link className="rounded-md border border-border px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-white" href="/admin/teams">
                  Modifier
                </Link>
              </div>
            </Card>
          ))}
        </section>
      </div>
    </PageShell>
  );
}
