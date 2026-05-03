"use server";

import { revalidatePath } from "next/cache";

import { completeStatuses, isGateBlock } from "@/lib/block-status";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Block, BlockProgress } from "@/types/database";

export async function submitBlockProgressAction(payload: {
  teamId: string;
  blockId: string;
  answer?: string;
  checklistState?: Record<string, boolean>;
  screenshotUrls?: string[];
  teamComment?: string;
}) {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const { data: block, error: blockError } = await supabase
    .schema("academy")
    .from("blocks")
    .select("*")
    .eq("id", payload.blockId)
    .single();

  if (blockError || !block) {
    return { ok: false, error: "Bloc introuvable", message: blockError?.message, correct: false };
  }

  const sequence = await assertPreviousBlocksComplete(supabase, payload.teamId, block);
  if (!sequence.ok) {
    return { ok: false, error: sequence.error, correct: false };
  }

  const result = evaluateBlock(block, payload.answer, payload.checklistState, payload.screenshotUrls);
  const existing = await supabase
    .schema("academy")
    .from("block_progress")
    .select("attempts,started_at,status,points_earned")
    .eq("team_id", payload.teamId)
    .eq("block_id", block.id)
    .maybeSingle();

  const wasAlreadyComplete = Boolean(existing.data?.status && completeStatuses.includes(existing.data.status));
  const attempts = (existing.data?.attempts ?? 0) + 1;
  const { error } = await supabase.schema("academy").from("block_progress").upsert(
    {
      team_id: payload.teamId,
      block_id: block.id,
      mission_id: block.mission_id,
      status: result.status,
      answer: payload.answer ?? null,
      checklist_state: payload.checklistState ?? null,
      screenshot_urls: payload.screenshotUrls ?? [],
      attempts,
      points_earned: wasAlreadyComplete ? existing.data?.points_earned ?? result.points : result.points,
      team_comment: payload.teamComment ?? null,
      needs_help: false,
      help_message: null,
      help_requested_at: null,
      started_at: existing.data?.started_at ?? now,
      completed_at: result.status === "correct" || result.status === "completed" ? now : null,
      submitted_at: result.status === "submitted" ? now : null,
    },
    { onConflict: "team_id,block_id" },
  );

  if (!error && result.points > 0 && !wasAlreadyComplete) {
    await creditOnce(supabase, payload.teamId, `block_${block.id}`, result.points);
    if (block.type === "qcm" && attempts === 1) {
      await awardBadge(supabase, payload.teamId, "bullseye");
    }
  }

  revalidatePath(`/team/${payload.teamId}`);
  return { ok: !error, ...result, attempts, message: error?.message };
}

export async function requestBlockHelpAction(payload: { teamId: string; blockId: string; message?: string }) {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const { data: block, error: blockError } = await supabase.schema("academy").from("blocks").select("*").eq("id", payload.blockId).single();
  if (blockError || !block) return { ok: false, error: "Bloc introuvable" };

  const { error } = await supabase.schema("academy").from("block_progress").upsert(
    {
      team_id: payload.teamId,
      block_id: block.id,
      mission_id: block.mission_id,
      status: "in_progress",
      needs_help: true,
      help_message: payload.message?.trim() || null,
      help_requested_at: now,
      started_at: now,
    },
    { onConflict: "team_id,block_id" },
  );

  revalidatePath("/admin/live");
  revalidatePath(`/team/${payload.teamId}`);
  return { ok: !error, error: error?.message };
}

async function awardBadge(supabase: ReturnType<typeof createAdminSupabaseClient>, teamId: string, code: string) {
  const badge = await supabase.schema("academy").from("badges").select("*").eq("code", code).maybeSingle();
  if (!badge.data) return;
  await supabase.schema("academy").from("team_badges").upsert(
    {
      team_id: teamId,
      badge_id: badge.data.id,
    },
    { onConflict: "team_id,badge_id" },
  );
  if ((badge.data.points_bonus ?? 0) > 0) {
    await creditOnce(supabase, teamId, `badge_${code}`, badge.data.points_bonus ?? 0);
  }
}

async function creditOnce(supabase: ReturnType<typeof createAdminSupabaseClient>, teamId: string, reason: string, points: number) {
  const existing = await supabase
    .schema("academy")
    .from("score_history")
    .select("id")
    .eq("team_id", teamId)
    .eq("reason", reason)
    .maybeSingle();

  if (existing.data) return;

  await supabase.schema("academy").from("score_history").insert({
    team_id: teamId,
    points,
    reason,
  });
}

async function assertPreviousBlocksComplete(supabase: ReturnType<typeof createAdminSupabaseClient>, teamId: string, block: Block) {
  if (!block.mission_id) return { ok: false, error: "Mission introuvable pour ce bloc" };

  const mission = await supabase.schema("academy").from("missions").select("display_mode").eq("id", block.mission_id).single();
  if (mission.data?.display_mode === "free") return { ok: true };

  const { data: blocks, error: blocksError } = await supabase
    .schema("academy")
    .from("blocks")
    .select("*")
    .eq("mission_id", block.mission_id)
    .order("order_index");

  if (blocksError || !blocks) return { ok: false, error: "Impossible de vérifier la séquence" };

  const roots = blocks.filter((candidate) => !candidate.parent_block_id).sort((a, b) => a.order_index - b.order_index);
  const currentRoot = block.parent_block_id ? blocks.find((candidate) => candidate.id === block.parent_block_id) : block;
  if (!currentRoot) return { ok: false, error: "Sous-tâche introuvable" };

  const previousRootGates = roots.filter((candidate) => candidate.order_index < currentRoot.order_index && isGateBlock(candidate));
  const previousSiblingGates = block.parent_block_id
    ? blocks.filter((candidate) => candidate.parent_block_id === block.parent_block_id && candidate.order_index < block.order_index && isGateBlock(candidate))
    : [];
  const previousGateBlocks = [...previousRootGates, ...previousSiblingGates];
  if (previousGateBlocks.length === 0) return { ok: true };
  const progressBlockIds = new Set(previousGateBlocks.map((candidate) => candidate.id));
  previousGateBlocks
    .filter((candidate) => candidate.type === "subtask")
    .forEach((subtask) => {
      blocks.filter((child) => child.parent_block_id === subtask.id && isGateBlock(child)).forEach((child) => progressBlockIds.add(child.id));
    });

  const { data: progress, error: progressError } = await supabase
    .schema("academy")
    .from("block_progress")
    .select("*")
    .eq("team_id", teamId)
    .in(
      "block_id",
      Array.from(progressBlockIds),
    );

  if (progressError) return { ok: false, error: "Impossible de vérifier la progression" };

  const progressRows = (progress as BlockProgress[] | null) ?? [];
  const completed = new Set(progressRows.filter((item) => item.status && completeStatuses.includes(item.status)).map((item) => item.block_id));
  const missing = previousGateBlocks.find((candidate) => {
    if (candidate.type !== "subtask") return !completed.has(candidate.id);
    const children = blocks.filter((child) => child.parent_block_id === candidate.id && isGateBlock(child));
    return children.some((child) => !completed.has(child.id));
  });

  return missing ? { ok: false, error: "Bloc précédent non complété" } : { ok: true };
}

function evaluateBlock(block: Block, answer = "", checklistState?: Record<string, boolean>, screenshotUrls: string[] = []) {
  if (block.type === "screenshot" || (block.type === "url" && !block.correct_answer)) {
    if (block.type === "screenshot" && screenshotUrls.length === 0) {
      return { status: "in_progress" as const, points: 0, correct: false };
    }
    if (block.type === "url" && !answer.trim()) {
      return { status: "in_progress" as const, points: 0, correct: false };
    }
    return { status: "submitted" as const, points: 0, correct: null };
  }
  if (block.type === "checklist") {
    const allChecked = Object.values(checklistState ?? {}).every(Boolean);
    return { status: allChecked ? ("completed" as const) : ("in_progress" as const), points: allChecked ? block.points ?? 0 : 0, correct: allChecked };
  }
  if (block.type === "qcm") {
    const selected = answer.split(",").filter(Boolean).sort().join(",");
    const options = Array.isArray(block.options) ? block.options : [];
    const expected = options
      .map((option, index) => (typeof option === "object" && option && "isCorrect" in option && option.isCorrect ? String(index) : null))
      .filter(Boolean)
      .sort()
      .join(",");
    const correct = selected === expected;
    return { status: correct ? ("correct" as const) : ("in_progress" as const), points: correct ? block.points ?? 0 : 0, correct };
  }
  if (block.type === "text_answer" || block.type === "code_execute") {
    const expected = block.correct_answer ?? block.code_expected_output;
    const normalize = (value: string) => value.trim().toLowerCase();
    const correct = expected ? normalize(answer) === normalize(expected) : false;
    return { status: correct ? ("correct" as const) : ("in_progress" as const), points: correct ? block.points ?? 0 : 0, correct };
  }
  if (block.type === "url") {
    const correct = block.correct_answer ? answer.trim() === block.correct_answer.trim() : screenshotUrls.length > 0;
    return { status: correct ? ("correct" as const) : ("in_progress" as const), points: correct ? block.points ?? 0 : 0, correct };
  }
  if (block.type === "prompt" || block.type === "separator" || block.type === "rich_content") {
    return { status: "completed" as const, points: 0, correct: true };
  }
  return { status: "completed" as const, points: block.points ?? 0, correct: true };
}
