import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge, Card, PageShell, ProgressBar } from "@/components/ui";
import { getTeamBundle } from "@/lib/data";
import { missionProgress, statusLabel } from "@/lib/progress";
import { teamMembersLabel } from "@/lib/teams";
import { isBlockComplete, isGateBlock } from "@/lib/block-status";

export const dynamic = "force-dynamic";

export default async function TeamPage({ params }: { params: { id: string } }) {
  const { team, missions, blocks, progress, exercises, badges, teamBadges } = await getTeamBundle(params.id);
  if (!team) notFound();
  const activeExercise = exercises.find((exercise) => exercise.is_active);
  const resume = getResumeTarget(missions, blocks, progress);

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="border-b border-border pb-5">
          <p className="text-5xl">{team.avatar_emoji ?? "🚀"}</p>
          <h1 className="mt-3 font-display text-4xl font-bold">{team.name}</h1>
          <p className="text-muted">{teamMembersLabel(team)}</p>
          <p className="mt-3 font-display text-3xl">{team.total_score ?? 0} pts</p>
        </header>

        {resume ? (
          <Card className="border-primary bg-primary/10">
            <p className="text-sm uppercase tracking-[0.2em] text-primary">Reprendre</p>
            <h2 className="mt-2 font-display text-2xl font-bold">{resume.mission.code} · {resume.mission.title}</h2>
            <p className="mt-1 text-sm text-muted">Prochaine action : {resume.block?.title ?? "continuer la mission"}</p>
            <Link className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90" href={`/team/${team.id}/mission/${resume.mission.code}${resume.block ? `#${resume.block.id}` : ""}`}>
              Reprendre là où j&apos;en étais
            </Link>
          </Card>
        ) : null}

        <section className="grid gap-3">
          {missions.map((mission) => {
            const state = missionProgress(mission, blocks, progress);
            return (
              <Link key={mission.id} href={state.status === "locked" ? `/team/${team.id}` : `/team/${team.id}/mission/${mission.code}`}>
                <Card className={state.status === "locked" ? "opacity-55" : "hover:border-primary"}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h2 className="font-display text-xl font-bold">{mission.code} · {mission.title}</h2>
                      <ProgressBar value={state.percent} />
                      {state.rejectedComment ? <p className="mt-2 text-sm text-accent-red">{state.rejectedComment}</p> : null}
                    </div>
                    <Badge tone={state.status === "validated" ? "green" : state.status === "submitted" ? "yellow" : state.status === "rejected" ? "red" : "indigo"}>{statusLabel(state.status)}</Badge>
                  </div>
                </Card>
              </Link>
            );
          })}
        </section>

        <Card>
          <h2 className="font-display text-2xl font-bold">Exercice bonus</h2>
          <p className="mt-2 text-muted">{activeExercise?.title ?? "Aucun exercice actif"}</p>
          {activeExercise ? (
            <Link className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90" href={`/exercise/${activeExercise.id}?teamId=${team.id}`}>
              Participer
            </Link>
          ) : null}
        </Card>

        <Card>
          <h2 className="font-display text-2xl font-bold">Badges</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {teamBadges.length === 0 ? <p className="text-sm text-muted">Aucun badge gagne pour le moment.</p> : null}
            {teamBadges.map((item) => {
              const badge = badges.find((candidate) => candidate.id === item.badge_id);
              return badge ? (
                <span key={item.id} className="animate-pop rounded-md border border-border bg-surface-2 px-3 py-2 text-sm">
                  {badge.emoji} {badge.title}
                </span>
              ) : null;
            })}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

function getResumeTarget(missions: Awaited<ReturnType<typeof getTeamBundle>>["missions"], blocks: Awaited<ReturnType<typeof getTeamBundle>>["blocks"], progress: Awaited<ReturnType<typeof getTeamBundle>>["progress"]) {
  for (const mission of missions) {
    if (mission.is_locked) continue;
    const missionBlocks = blocks.filter((block) => block.mission_id === mission.id).sort((a, b) => a.order_index - b.order_index);
    const nextBlock = missionBlocks.filter(isGateBlock).find((block) => !isBlockComplete(progress.find((item) => item.block_id === block.id)));
    if (nextBlock) return { mission, block: nextBlock };
    if (missionProgress(mission, blocks, progress).status !== "validated") return { mission, block: null };
  }
  return null;
}
