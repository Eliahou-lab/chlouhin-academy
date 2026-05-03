import type { Block, BlockProgress, BlockProgressStatus, Mission } from "@/types/database";
import { isBlockComplete, isGateBlock } from "@/lib/block-status";

export function missionProgress(mission: Mission, blocks: Block[], progress: BlockProgress[]) {
  const missionBlocks = blocks.filter((block) => block.mission_id === mission.id);
  const blockingBlocks = missionBlocks.filter(isGateBlock);
  const items = progress.filter((item) => item.mission_id === mission.id);
  const completedBlocking = blockingBlocks.filter((block) => {
    const state = items.find((item) => item.block_id === block.id);
    return isBlockComplete(state);
  }).length;
  const submitted = items.some((item) => item.status === "submitted");
  const rejected = items.find((item) => item.status === "rejected");
  const earned = items.reduce((sum, item) => sum + (item.points_earned ?? 0), 0);
  let status: BlockProgressStatus = mission.is_locked ? "locked" : "in_progress";

  if (rejected) status = "rejected";
  else if (blockingBlocks.length > 0 && completedBlocking >= blockingBlocks.length) status = "validated";
  else if (submitted) status = "submitted";

  return {
    status,
    total: blockingBlocks.length,
    validated: completedBlocking,
    earned,
    percent: blockingBlocks.length ? Math.round((completedBlocking / blockingBlocks.length) * 100) : 0,
    rejectedComment: rejected?.formateur_comment ?? null,
  };
}

export function globalProgress(missions: Mission[], blocks: Block[], progress: BlockProgress[]) {
  const total = missions.length;
  const validated = missions.filter((mission) => missionProgress(mission, blocks, progress).status === "validated").length;
  return { total, validated, percent: total ? Math.round((validated / total) * 100) : 0 };
}

export function statusLabel(status: BlockProgressStatus) {
  return {
    locked: "Verrouillee",
    in_progress: "En cours",
    completed: "Complete",
    correct: "Correct",
    submitted: "Soumise",
    validated: "Validee",
    rejected: "Refusee",
  }[status];
}
