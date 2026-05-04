import Link from "next/link";

import { RealtimeRefresh } from "@/components/realtime-refresh";
import { Badge, Card, PageShell, ProgressBar } from "@/components/ui";
import { getBlockProgress, getBlocks, getMissions, getTeams } from "@/lib/data";
import { isBlockComplete, isGateBlock, missionCompletion } from "@/lib/block-status";
import { missionProgress, statusLabel } from "@/lib/progress";
import { teamMembersLabel } from "@/lib/teams";
import type { Block, BlockProgress, Mission } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AdminLivePage() {
  const [teams, missions, blocks, progress] = await Promise.all([getTeams(), getMissions(), getBlocks(), getBlockProgress()]);
  const helpRequests = progress.filter((item) => item.needs_help);

  return (
    <PageShell>
      <RealtimeRefresh tables={["block_progress", "score_history"]} />
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="font-display text-xs uppercase text-primary">Live classe</p>
            <h1 className="font-display text-4xl font-bold">Cockpit formateur</h1>
          </div>
          <Link className="rounded-md border border-border px-4 py-2 text-sm text-muted hover:bg-surface-2 hover:text-white" href="/admin">
            Admin
          </Link>
        </header>

        {helpRequests.length ? (
          <Card className="border-accent-yellow bg-accent-yellow/10">
            <h2 className="font-display text-2xl font-bold text-accent-yellow">Demandes d&apos;aide</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {helpRequests.map((item) => {
                const team = teams.find((candidate) => candidate.id === item.team_id);
                const mission = missions.find((candidate) => candidate.id === item.mission_id);
                const block = blocks.find((candidate) => candidate.id === item.block_id);
                return (
                  <div key={item.id} className="rounded-md border border-border bg-surface p-3">
                    <p className="font-display font-bold">{team?.avatar_emoji ?? "🚀"} {team?.name ?? "Equipe"}</p>
                    <p className="text-sm text-muted">{mission?.code ?? "-"} · {block?.title ?? "Bloc"}</p>
                    {item.help_message ? <p className="mt-2 text-sm">{item.help_message}</p> : null}
                  </div>
                );
              })}
            </div>
          </Card>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-2">
          {teams.map((team) => {
            const teamProgress = progress.filter((item) => item.team_id === team.id);
            const visibleMissions = missions.filter((mission) => mission.is_published);
            const current = currentPosition(visibleMissions, blocks, teamProgress);
            const currentMissionBlocks = current ? blocks.filter((block) => block.mission_id === current.mission.id) : [];
            const completion = missionCompletion(currentMissionBlocks, teamProgress);

            return (
              <Card key={team.id} className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl font-bold">{team.avatar_emoji ?? "🚀"} {team.name}</h2>
                    <p className="text-sm text-muted">{teamMembersLabel(team)}</p>
                  </div>
                  <Badge tone={teamProgress.some((item) => item.needs_help) ? "yellow" : "green"}>
                    {teamProgress.some((item) => item.needs_help) ? "Aide demandee" : `${team.total_score ?? 0} pts`}
                  </Badge>
                </div>
                <div className="rounded-md border border-border bg-surface-2 p-3">
                  <p className="text-sm text-muted">Position actuelle</p>
                  <p className="mt-1 font-display text-xl">
                    {current ? `${current.mission.code} · ${current.mission.title}` : "Aucune mission en cours"}
                  </p>
                  <p className="mt-1 text-sm text-primary">{current?.label ?? "En attente"}</p>
                  {current?.progress?.status ? <p className="mt-1 text-xs text-muted">Statut bloc : {statusLabel(current.progress.status)}</p> : null}
                </div>
                <ProgressBar value={completion.percent} />
                <p className="text-xs text-muted">{completion.completed}/{completion.total} blocs complétés sur la mission actuelle</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleMissions.map((mission) => {
                    const state = missionProgress(mission, blocks, teamProgress);
                    const missionBlocks = blocks.filter((block) => block.mission_id === mission.id);
                    const missionCompletionState = missionCompletion(missionBlocks, teamProgress);
                    return (
                      <div key={mission.id} className={`rounded-md border p-3 ${missionTone(state.status)}`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-display text-sm">{mission.code}</p>
                          <span className="text-[11px]">{statusLabel(state.status)}</span>
                        </div>
                        <p className="mt-1 truncate text-xs">{mission.title}</p>
                        <div className="mt-2">
                          <ProgressBar value={missionCompletionState.percent} />
                        </div>
                        <p className="mt-1 text-[11px] opacity-80">
                          {missionCompletionState.completed}/{missionCompletionState.total} · {missionCompletionState.percent}%
                        </p>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </section>
      </div>
    </PageShell>
  );
}

function currentPosition(missions: Mission[], blocks: Block[], progress: BlockProgress[]) {
  for (const mission of missions.filter((item) => !item.is_locked)) {
    const missionBlocks = blocks.filter((block) => block.mission_id === mission.id);
    const roots = missionBlocks.filter((block) => !block.parent_block_id).sort((a, b) => a.order_index - b.order_index);

    for (const root of roots) {
      if (!isGateBlock(root)) continue;
      if (root.type === "subtask") {
        const child = missionBlocks
          .filter((block) => block.parent_block_id === root.id)
          .sort((a, b) => a.order_index - b.order_index)
          .filter(isGateBlock)
          .find((block) => !isBlockComplete(progress.find((item) => item.block_id === block.id)));

        if (child) {
          return {
            mission,
            block: child,
            progress: progress.find((item) => item.block_id === child.id),
            label: `${root.title ?? "Sous-tâche"} → ${child.title ?? child.type}`,
          };
        }
        continue;
      }

      const blockProgress = progress.find((item) => item.block_id === root.id);
      if (!isBlockComplete(blockProgress)) {
        return {
          mission,
          block: root,
          progress: blockProgress,
          label: root.title ?? root.type,
        };
      }
    }
  }
  return null;
}

function missionTone(status: string) {
  if (status === "validated" || status === "completed" || status === "correct") return "border-accent-green bg-accent-green/10 text-accent-green";
  if (status === "submitted") return "border-accent-yellow bg-accent-yellow/10 text-accent-yellow";
  if (status === "rejected") return "border-accent-red bg-accent-red/10 text-accent-red";
  if (status === "locked") return "border-border bg-surface-2 text-muted opacity-70";
  return "border-primary bg-primary/10 text-primary";
}
