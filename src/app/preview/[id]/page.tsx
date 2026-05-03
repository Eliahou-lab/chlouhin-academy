import { notFound } from "next/navigation";

import { BlockRenderer } from "@/components/block-renderer";
import { Badge, Card, PageShell, ProgressBar } from "@/components/ui";
import { getMissionBlockVisibility, getSequentialBlockStates, missionCompletion } from "@/lib/block-status";
import { getMissionEditorBundle } from "@/lib/data";
import type { Block } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function PreviewPage({ params }: { params: { id: string } }) {
  const { mission, blocks } = await getMissionEditorBundle(params.id);
  if (!mission) notFound();
  const visibleBlocks = getMissionBlockVisibility(blocks, [], mission.display_mode ?? "all_visible");
  const displayModeLabel = {
    all_visible: "Tout visible",
    progressive: "Révélation progressive",
    sections: "Par sections",
    free: "Libre",
  }[mission.display_mode ?? "all_visible"];

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl space-y-5">
        <Card className="border-accent-yellow/50 bg-accent-yellow/10">
          <Badge tone="yellow">MODE PREVISUALISATION</Badge>
          <Badge tone="muted">{displayModeLabel}</Badge>
          <h1 className="mt-3 font-display text-4xl font-bold">
            {mission.code} · {mission.title}
          </h1>
          <p className="mt-2 text-muted">{mission.persona_scenario}</p>
        </Card>
        {visibleBlocks.filter((item) => item.visible).map(({ block, locked, state, revealContent }) =>
          block.type === "subtask" ? (
            <SubtaskPreview key={block.id} subtask={block} allBlocks={blocks} locked={locked} revealContent={revealContent} />
          ) : (
            <BlockRenderer key={block.id} block={block} locked={locked} visualState={state} revealContent={revealContent} preview />
          ),
        )}
      </div>
    </PageShell>
  );
}

function SubtaskPreview({ subtask, allBlocks, locked, revealContent }: { subtask: Block; allBlocks: Block[]; locked: boolean; revealContent: boolean }) {
  const children = allBlocks.filter((block) => block.parent_block_id === subtask.id).sort((a, b) => a.order_index - b.order_index);
  const completion = missionCompletion(children, []);
  const childStates = getSequentialBlockStates(children, []);

  return (
    <Card className={`space-y-4 ${locked ? "opacity-50" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <Badge>📋 Sous-tâche</Badge>
          <h2 className="mt-3 font-display text-2xl font-bold">{subtask.title}</h2>
          {subtask.content ? <p className="mt-2 text-sm text-muted">{subtask.content}</p> : null}
        </div>
        <span className="text-sm text-muted">{completion.completed}/{completion.total} complétés</span>
      </div>
      <ProgressBar value={completion.percent} />
      {revealContent ? (
        <div className="space-y-3">
          {childStates.map(({ block, locked: childLocked, state }) => (
            <BlockRenderer key={block.id} block={block} locked={locked || childLocked} visualState={locked ? "locked" : state} preview />
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-border bg-surface-2 p-3 text-sm text-muted">Contenu masqué en prévisualisation selon le mode choisi.</p>
      )}
    </Card>
  );
}
