import Link from "next/link";

import { Badge, Card, EmptyState, PageShell } from "@/components/ui";
import { getBlocks, getMissions } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminMissionsPage() {
  const [missions, blocks] = await Promise.all([getMissions(), getBlocks()]);

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
            <Link key={mission.id} href={`/admin/missions/${mission.id}`}>
              <Card className="flex flex-wrap items-center justify-between gap-4 hover:border-primary">
                <div>
                  <h2 className="font-display text-xl font-bold">
                    {mission.code} · {mission.title}
                  </h2>
                  <p className="text-sm text-muted">{blocks.filter((block) => block.mission_id === mission.id).length} blocs</p>
                </div>
                <Badge tone={mission.is_locked ? "muted" : "green"}>{mission.is_locked ? "Verrouillee" : "Ouverte"}</Badge>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
