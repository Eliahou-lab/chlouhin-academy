import Link from "next/link";

import { TeamAccessGrid } from "@/components/team-access-grid";
import { EmptyState, PageShell } from "@/components/ui";
import { getAdminDashboardTeams, getBlockProgress, getBlocks, getMissions } from "@/lib/data";
import { globalProgress } from "@/lib/progress";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [teams, missions, blocks, allProgress] = await Promise.all([getAdminDashboardTeams(), getMissions(), getBlocks(), getBlockProgress()]);
  const sortedTeams = [...teams].sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0));

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="font-display text-xs uppercase text-primary">Mission control LMS</p>
            <h1 className="font-display text-4xl font-bold">ChlouhIN Academy</h1>
          </div>
          <Link className="text-sm text-muted hover:text-white" href="/admin">Admin</Link>
        </header>

        {sortedTeams.length === 0 ? <EmptyState title="Aucune equipe trouvee" /> : null}

        <TeamAccessGrid
          teams={sortedTeams.map((team, index) => {
            const teamProgress = allProgress.filter((item) => item.team_id === team.id);
            const global = globalProgress(missions, blocks, teamProgress);

            return {
              ...team,
              rank: index + 1,
              progressLabel: `${global.validated}/${global.total}`,
              progressPercent: global.percent,
            };
          })}
        />
      </div>
    </PageShell>
  );
}
