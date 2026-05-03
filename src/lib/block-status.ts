import type { Block, BlockProgress, BlockProgressStatus, MissionDisplayMode } from "@/types/database";

export const completeStatuses: BlockProgressStatus[] = ["completed", "correct", "validated"];
export type VisualBlockState = "locked" | "completed" | "submitted" | "rejected" | "active";

export function isBlockComplete(progress?: BlockProgress) {
  return Boolean(progress?.status && completeStatuses.includes(progress.status));
}

export function isBlockPending(progress?: BlockProgress) {
  return progress?.status === "submitted";
}

export function isBlockRejected(progress?: BlockProgress) {
  return progress?.status === "rejected";
}

export function isGateBlock(block: Block) {
  if (block.type === "subtask") return Boolean(block.is_blocking);
  if (block.type === "separator" || block.type === "prompt" || block.type === "rich_content") return false;
  if (block.type === "theory" || block.type === "url" || block.type === "screenshot" || block.type === "checklist" || block.type === "code_execute") return true;
  if (block.type === "video") return Boolean(block.is_blocking || block.video_must_complete);
  return Boolean(block.is_blocking);
}

export function isSubtaskComplete(subtask: Block, blocks: Block[], progress: BlockProgress[]) {
  const children = blocks.filter((block) => block.parent_block_id === subtask.id);
  const gates = children.filter(isGateBlock);
  if (gates.length === 0) return true;
  return gates.every((block) => isBlockComplete(progress.find((item) => item.block_id === block.id)));
}

export function blockState(block: Block, progress?: BlockProgress, locked = false): VisualBlockState {
  if (locked) return "locked" satisfies VisualBlockState;
  if (isBlockComplete(progress)) return "completed" satisfies VisualBlockState;
  if (isBlockPending(progress)) return "submitted" satisfies VisualBlockState;
  if (isBlockRejected(progress)) return "rejected" satisfies VisualBlockState;
  return "active" satisfies VisualBlockState;
}

export function getSequentialBlockStates(blocks: Block[], progress: BlockProgress[]) {
  let blockedByPrevious = false;

  return blocks.map((block) => {
    const state = progress.find((item) => item.block_id === block.id);
    const locked = blockedByPrevious;
    const gate = isGateBlock(block);
    const complete = block.type === "subtask" ? isSubtaskComplete(block, blocks, progress) : isBlockComplete(state);

    if (!locked && gate && !complete) {
      blockedByPrevious = true;
    }

    return {
      block,
      progress: state,
      locked,
      gate,
      state: block.type === "subtask" && complete ? "completed" : blockState(block, state, locked),
    };
  });
}

export function getMissionBlockVisibility(blocks: Block[], progress: BlockProgress[], mode: MissionDisplayMode | null) {
  const roots = blocks.filter((block) => !block.parent_block_id).sort((a, b) => a.order_index - b.order_index);
  let blockedByPrevious = false;
  const sequential = roots.map((block) => {
    const state = progress.find((item) => item.block_id === block.id);
    const locked = blockedByPrevious;
    const gate = isGateBlock(block);
    const complete = block.type === "subtask" ? isSubtaskComplete(block, blocks, progress) : isBlockComplete(state);

    if (!locked && gate && !complete) {
      blockedByPrevious = true;
    }

    return {
      block,
      progress: state,
      locked,
      gate,
      state: block.type === "subtask" && complete ? ("completed" as const) : blockState(block, state, locked),
    };
  });

  if (mode === "free") {
    return sequential.map((item) => ({
      ...item,
      locked: false,
      state: blockState(item.block, item.progress, false),
      visible: true,
      revealContent: true,
    }));
  }

  if (mode === "progressive") {
    const activeIndex = sequential.findIndex((item) => !isBlockComplete(item.progress) && !item.locked);
    const visibleIndex = activeIndex >= 0 ? activeIndex : Math.max(0, sequential.length - 1);
    return sequential.map((item, index) => ({
      ...item,
      visible: index === visibleIndex,
      revealContent: index === visibleIndex,
    }));
  }

  if (mode === "sections") {
    return sequential.map((item) => ({
      ...item,
      visible: true,
      revealContent: !item.locked,
    }));
  }

  return sequential.map((item) => ({
    ...item,
    visible: true,
    revealContent: true,
  }));
}

export function missionCompletion(blocks: Block[], progress: BlockProgress[]) {
  const gates = blocks.filter((block) => block.type !== "subtask").filter(isGateBlock);
  const completed = gates.filter((block) => isBlockComplete(progress.find((item) => item.block_id === block.id))).length;
  return {
    completed,
    total: gates.length,
    percent: gates.length ? Math.round((completed / gates.length) * 100) : 0,
  };
}
