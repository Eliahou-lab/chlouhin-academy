import { notFound } from "next/navigation";

import { MissionPlayer } from "@/components/mission-player";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { PageShell } from "@/components/ui";
import { getTeamBundle } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function MissionPage({ params }: { params: { id: string; code: string } }) {
  const { team, teams, missions, blocks, progress, badges, teamBadges } = await getTeamBundle(params.id);
  if (!team) notFound();
  const mission = missions.find((item) => item.code.toLowerCase() === params.code.toLowerCase());
  if (!mission) notFound();

  return (
    <PageShell>
      <RealtimeRefresh tables={["block_progress", "score_history", "team_badges"]} />
      <MissionPlayer
        team={team}
        teams={teams}
        mission={mission}
        blocks={blocks}
        initialProgress={progress}
        badges={badges}
        teamBadges={teamBadges}
      />
    </PageShell>
  );
}
