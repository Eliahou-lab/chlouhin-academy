import { notFound } from "next/navigation";

import { BlockRenderer } from "@/components/block-renderer";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { Badge, Card, PageShell, ProgressBar } from "@/components/ui";
import { getMissionBlockVisibility, getSequentialBlockStates, isGateBlock, missionCompletion } from "@/lib/block-status";
import { getTeamBundle } from "@/lib/data";
import type { Block, BlockProgress, MissionDisplayMode } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function MissionPage({ params }: { params: { id: string; code: string } }) {
  const { team, missions, blocks, progress } = await getTeamBundle(params.id);
  if (!team) notFound();
  const mission = missions.find((item) => item.code.toLowerCase() === params.code.toLowerCase());
  if (!mission) notFound();
  const missionBlocks = blocks.filter((block) => block.mission_id === mission.id).sort((a, b) => a.order_index - b.order_index);
  const visibleBlocks = getMissionBlockVisibility(missionBlocks, progress, mission.display_mode ?? "all_visible");
  const completion = missionCompletion(missionBlocks, progress);
  const lastGateBlockId = [...missionBlocks].reverse().find(isGateBlock)?.id;
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
        </header>

        <section className="space-y-3">
          {missionBlocks.length === 0 ? <Card className="text-muted">Aucun bloc dans cette mission.</Card> : null}
          {visibleBlocks.filter((item) => item.visible).map(({ block, progress: blockProgress, locked, state, revealContent }) =>
            block.type === "subtask" ? (
              <SubtaskSection
                key={block.id}
                subtask={block}
                allBlocks={missionBlocks}
                progress={progress}
                teamId={team.id}
                locked={locked}
                revealContent={revealContent}
                mode={mission.display_mode ?? "all_visible"}
              />
            ) : (
              <BlockRenderer
                key={block.id}
                block={block}
                teamId={team.id}
                progress={blockProgress}
                locked={locked}
                visualState={state}
                revealContent={revealContent}
                isLastGate={block.id === lastGateBlockId}
              />
            ),
          )}
        </section>
      </div>
    </PageShell>
  );
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
