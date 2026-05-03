import Link from "next/link";

import { duplicateMissionAction, toggleMissionPublishedAction } from "@/app/actions/missions";
import { Badge, Card, EmptyState, PageShell } from "@/components/ui";
import { getBlocks, getMissions } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminMissionsPage() {
  const [missions, blocks] = await Promise.all([getMissions(), getBlocks()]);
  const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "";

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex items-center justify-between border-b border-border pb-5">
          <h1 className="font-display text-3xl font-bold">Missions</h1>
          <div className="flex gap-3 text-sm">
            <Link className="text-muted hover:text-white" href="/admin">Admin</Link>
            <Link className="rounded-md bg-primary px-3 py-2 font-semibold text-white hover:opacity-90" href="/admin/missions/new">Nouvelle mission</Link>
          </div>
        </header>
        {missions.length === 0 ? <EmptyState title="Aucune mission Supabase" href="/admin" /> : null}
        <div className="grid gap-3">
          {missions.map((mission) => (
            <Card key={mission.id} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-bold">
                    {mission.code} · {mission.title}
                  </h2>
                  <p className="text-sm text-muted">{blocks.filter((block) => block.mission_id === mission.id).length} blocs</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={mission.is_published ? "green" : "yellow"}>{mission.is_published ? "Publiee" : "Brouillon"}</Badge>
                  <Badge tone={mission.is_locked ? "muted" : "green"}>{mission.is_locked ? "Verrouillee" : "Ouverte"}</Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link className="rounded-md border border-border px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-white" href={`/admin/missions/${mission.id}`}>
                  Editer
                </Link>
                <form action={toggleMissionPublishedAction}>
                  <input type="hidden" name="adminSecret" value={adminSecret} />
                  <input type="hidden" name="missionId" value={mission.id} />
                  <input type="hidden" name="is_published" value={mission.is_published ? "false" : "true"} />
                  <button className="rounded-md border border-border px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-white">
                    {mission.is_published ? "Repasser en brouillon" : "Publier"}
                  </button>
                </form>
                <form action={duplicateMissionAction} className="flex flex-wrap gap-2">
                  <input type="hidden" name="adminSecret" value={adminSecret} />
                  <input type="hidden" name="missionId" value={mission.id} />
                  <input className="h-10 w-28 rounded-md border border-border bg-surface px-3 text-sm" name="newCode" placeholder={`${mission.code}-COPY`} required />
                  <button className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:opacity-90">Dupliquer</button>
                </form>
              </div>
              </Card>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
