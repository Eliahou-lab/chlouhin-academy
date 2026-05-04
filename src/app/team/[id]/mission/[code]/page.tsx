import { notFound } from "next/navigation";

import { BlockRenderer } from "@/components/block-renderer";
import { MissionFocusControls } from "@/components/mission-focus-controls";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { Badge, Card, PageShell, ProgressBar } from "@/components/ui";
import { getMissionBlockVisibility, getSequentialBlockStates, isBlockComplete, isGateBlock, missionCompletion } from "@/lib/block-status";
import { getTeamBundle } from "@/lib/data";
import type { Block, BlockProgress, MissionDisplayMode } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function MissionPage({ params }: { params: { id: string; code: string } }) {
  const { team, teams, missions, blocks, progress, badges, teamBadges } = await getTeamBundle(params.id);
  if (!team) notFound();
  const mission = missions.find((item) => item.code.toLowerCase() === params.code.toLowerCase());
  if (!mission) notFound();
  const missionBlocks = blocks.filter((block) => block.mission_id === mission.id).sort((a, b) => a.order_index - b.order_index);
  const visibleBlocks = getMissionBlockVisibility(missionBlocks, progress, mission.display_mode ?? "all_visible");
  const completion = missionCompletion(missionBlocks, progress);
  const lastGateBlockId = [...missionBlocks].reverse().find(isGateBlock)?.id;
  const focusItems = visibleBlocks
    .filter((item) => item.visible)
    .map((item) => ({ id: item.block.id, title: item.block.title ?? item.block.type, status: item.state }));
  const currentBlock = visibleBlocks.find((item) => item.visible && !item.locked && !isBlockComplete(item.progress))?.block;
  const rank = [...teams].sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0)).findIndex((item) => item.id === team.id) + 1;
  const nextTeam = [...teams].sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0))[rank - 2];
  const earnedBadges = teamBadges.map((item) => badges.find((badge) => badge.id === item.badge_id)).filter(Boolean);
  const displayModeLabel = {
    all_visible: "Tout visible",
    progressive: "Révélation progressive",
    sections: "Par sections",
    free: "Libre",
  }[mission.display_mode ?? "all_visible"];

  return (
    <PageShell>
      <RealtimeRefresh tables={["block_progress", "score_history", "team_badges"]} />
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="sticky top-0 z-40 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-sm text-primary">{team.avatar_emoji ?? "🚀"} {team.name} · #{rank}</p>
              <p className="text-xs text-muted">
                {currentBlock ? `Bloc actuel : ${currentBlock.title ?? currentBlock.type}` : "Mission presque terminée"}
                {nextTeam ? ` · ${Math.max(0, (nextTeam.total_score ?? 0) - (team.total_score ?? 0))} pts du rang précédent` : ""}
              </p>
            </div>
            <div className="min-w-[180px]">
              <div className="mb-1 text-right text-xs text-muted">{completion.percent}%</div>
              <ProgressBar value={completion.percent} />
            </div>
          </div>
        </div>
        <header className="border-b border-border pb-5">
          <div className="flex flex-wrap gap-2">
            <Badge>{mission.code}</Badge>
            <Badge tone="muted">{displayModeLabel}</Badge>
          </div>
          <h1 className="mt-3 font-display text-4xl font-bold">{mission.title}</h1>
          <p className="mt-2 text-muted">{mission.persona_scenario}</p>
          <div className="mt-5 rounded-lg border border-border bg-surface p-4">
            <div className="mb-2 flex justify-between text-sm text-muted">
              <span>Progression mission</span>
              <span>
                {completion.completed} / {completion.total} blocs completes · {completion.percent}%
              </span>
            </div>
            <ProgressBar value={completion.percent} />
          </div>
          {earnedBadges.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {earnedBadges.map((badge) => badge ? <span key={badge.id} className="animate-pop rounded-md border border-border bg-surface-2 px-3 py-2 text-sm">{badge.emoji} {badge.title}</span> : null)}
            </div>
          ) : null}
        </header>

        <MissionTimeline items={focusItems} />
        <MissionFocusControls items={focusItems} />

        <section className="space-y-3">
          {missionBlocks.length === 0 ? <Card className="text-muted">Aucun bloc dans cette mission.</Card> : null}
          {visibleBlocks.filter((item) => item.visible).map(({ block, progress: blockProgress, locked, state, revealContent }) =>
            block.type === "subtask" ? (
              <div key={block.id} data-focus-block={block.id}>
                <SubtaskSection
                  subtask={block}
                  allBlocks={missionBlocks}
                  progress={progress}
                  teamId={team.id}
                  locked={locked}
                  revealContent={revealContent}
                  mode={mission.display_mode ?? "all_visible"}
                />
              </div>
            ) : (
              <div key={block.id} data-focus-block={block.id}>
                <BlockRenderer
                  block={block}
                  teamId={team.id}
                  progress={blockProgress}
                  locked={locked}
                  visualState={state}
                  revealContent={revealContent}
                  isLastGate={block.id === lastGateBlockId}
                />
              </div>
            ),
          )}
        </section>
      </div>
    </PageShell>
  );
}

function MissionTimeline({ items }: { items: Array<{ id: string; title: string; status: string }> }) {
  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">Timeline mission</h2>
        <span className="text-xs text-muted">{items.length} étapes</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map((item, index) => (
          <a key={item.id} href={`#${item.id}`} className={`min-w-[150px] rounded-lg border p-3 text-sm ${timelineTone(item.status)}`}>
            <span className="font-display">#{index + 1}</span>
            <p className="mt-1 truncate">{item.title}</p>
          </a>
        ))}
      </div>
    </Card>
  );
}

function timelineTone(status: string) {
  if (status === "completed") return "border-accent-green bg-accent-green/10 text-accent-green";
  if (status === "submitted") return "border-accent-yellow bg-accent-yellow/10 text-accent-yellow";
  if (status === "rejected") return "border-accent-red bg-accent-red/10 text-accent-red";
  if (status === "locked") return "border-border bg-surface-2 text-muted opacity-70";
  return "border-primary bg-primary/10 text-primary";
}

function SubtaskSection({
  subtask,
  allBlocks,
  progress,
  teamId,
  locked,
  revealContent,
  mode,
}: {
  subtask: Block;
  allBlocks: Block[];
  progress: BlockProgress[];
  teamId: string;
  locked: boolean;
  revealContent: boolean;
  mode: MissionDisplayMode;
}) {
  const children = allBlocks.filter((block) => block.parent_block_id === subtask.id).sort((a, b) => a.order_index - b.order_index);
  const childStates = mode === "free" ? getSequentialBlockStates(children, progress).map((item) => ({ ...item, locked: false, state: item.state === "locked" ? ("active" as const) : item.state })) : getSequentialBlockStates(children, progress);
  const completion = missionCompletion(children, progress);
  const remaining = Math.max(0, completion.total - completion.completed);

  return (
    <Card className={`space-y-4 ${locked ? "opacity-50" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <Badge tone={completion.completed >= completion.total && completion.total > 0 ? "green" : "indigo"}>📋 Sous-tâche</Badge>
          <h2 className="mt-3 font-display text-2xl font-bold">{subtask.title}</h2>
          {subtask.content ? <p className="mt-2 text-sm text-muted">{subtask.content}</p> : null}
        </div>
        <span className="text-sm text-muted">
          {completion.completed}/{completion.total} complétés
        </span>
      </div>
      <ProgressBar value={completion.percent} />
      {completion.total > 0 && completion.completed >= completion.total ? (
        <div className="rounded-md border border-accent-green/40 bg-accent-green/10 p-3 text-sm text-accent-green">
          Checkpoint atteint : sous-tâche terminée. Vous pouvez passer à la suite.
        </div>
      ) : remaining === 1 ? (
        <div className="rounded-md border border-primary/40 bg-primary/10 p-3 text-sm text-primary">
          Plus qu&apos;un bloc pour finir cette sous-tâche.
        </div>
      ) : null}
      {!revealContent ? <p className="rounded-md border border-border bg-surface-2 p-3 text-sm text-muted">Complète la sous-tâche précédente pour révéler ce contenu.</p> : null}
      {revealContent ? (
        <div className="space-y-3">
          {childStates.map(({ block, progress: blockProgress, locked: childLocked, state }) => (
            <BlockRenderer key={block.id} block={block} teamId={teamId} progress={blockProgress} locked={locked || childLocked} visualState={locked ? "locked" : state} />
          ))}
          {children.length === 0 ? <p className="text-sm text-muted">Aucun bloc dans cette sous-tâche.</p> : null}
        </div>
      ) : null}
    </Card>
  );
}
