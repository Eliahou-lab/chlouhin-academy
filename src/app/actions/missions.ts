"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { adminDenied, isAdminAuthorized } from "@/lib/admin-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Block, BlockType, Json, Mission } from "@/types/database";

export type EditableBlock = Omit<
  Pick<
  Block,
  | "id"
  | "parent_block_id"
  | "type"
  | "title"
  | "content"
  | "prompt_code"
  | "options"
  | "correct_answer"
  | "feedback_wrong"
  | "checklist_items"
  | "video_url"
  | "video_must_complete"
  | "code_command"
  | "code_expected_output"
  | "points"
  | "is_blocking"
  | "order_index"
  >,
  "id"
> & { id?: string };

export type MissionSavePayload = {
  mission: Pick<Mission, "id" | "code" | "title" | "persona" | "persona_scenario" | "display_mode" | "is_locked">;
  blocks: EditableBlock[];
  adminSecret?: string;
};

export async function saveMissionBuilderAction(payload: MissionSavePayload) {
  if (!isAdminAuthorized(payload.adminSecret)) return adminDenied();

  const supabase = createAdminSupabaseClient();
  const pointsTotal = payload.blocks.reduce((sum, block) => sum + (block.points ?? 0), 0);
  const { error: missionError } = await supabase
    .schema("academy")
    .from("missions")
    .update({
      code: payload.mission.code,
      title: payload.mission.title,
      persona: payload.mission.persona === "Aucun" ? null : payload.mission.persona,
      persona_scenario: payload.mission.persona_scenario,
      display_mode: payload.mission.display_mode ?? "all_visible",
      is_locked: payload.mission.is_locked,
      points_total: pointsTotal,
    })
    .eq("id", payload.mission.id);

  if (missionError) return { ok: false, message: missionError.message };

  const existing = await supabase.schema("academy").from("blocks").select("id").eq("mission_id", payload.mission.id);
  const incomingIds = new Set(payload.blocks.map((block) => block.id).filter(Boolean));
  const toDelete = (existing.data ?? []).filter((block) => !incomingIds.has(block.id)).map((block) => block.id);

  if (toDelete.length > 0) {
    const { error } = await supabase.schema("academy").from("blocks").delete().in("id", toDelete);
    if (error) return { ok: false, message: error.message };
  }

  const sortedBlocks = [...payload.blocks].sort((a, b) => {
    if (!a.parent_block_id && b.parent_block_id) return -1;
    if (a.parent_block_id && !b.parent_block_id) return 1;
    return a.order_index - b.order_index;
  });

  for (const block of sortedBlocks) {
    const row = sanitizeBlock(block, payload.mission.id, block.order_index);
    const { error } = await supabase.schema("academy").from("blocks").upsert(row, { onConflict: "id" });
    if (error) return { ok: false, message: error.message };
  }

  revalidatePath(`/admin/missions/${payload.mission.id}`);
  revalidatePath(`/preview/${payload.mission.id}`);
  revalidatePath("/");
  return { ok: true, savedAt: new Date().toISOString() };
}

export async function createMissionAction(formData: FormData) {
  if (!isAdminAuthorized(formData.get("adminSecret"))) return;

  const supabase = createAdminSupabaseClient();
  const code = String(formData.get("code") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const persona = String(formData.get("persona") ?? "Aucun");
  const personaScenario = String(formData.get("persona_scenario") ?? "").trim();
  const displayMode = String(formData.get("display_mode") ?? "all_visible") as Mission["display_mode"];
  const orderIndex = Number(formData.get("order_index") ?? 99);
  const isLocked = formData.get("is_locked") === "on";

  if (!code || !title) return;

  const { data, error } = await supabase
    .schema("academy")
    .from("missions")
    .insert({
      code,
      title,
      persona: persona === "Aucun" ? null : persona,
      persona_scenario: personaScenario || null,
      prompt_windsurf: "",
      display_mode: displayMode ?? "all_visible",
      order_index: orderIndex,
      is_locked: isLocked,
      points_total: 0,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error) console.error("[Supabase error]", error);
    return;
  }

  revalidatePath("/admin/missions");
  redirect(`/admin/missions/${data.id}`);
}

function sanitizeBlock(block: EditableBlock, missionId: string, orderIndex: number) {
  return {
    id: block.id,
    mission_id: missionId,
    parent_block_id: block.parent_block_id || null,
    type: block.type,
    title: block.title || null,
    content: block.content || null,
    prompt_code: block.prompt_code || null,
    options: (block.options ?? null) as Json,
    correct_answer: block.correct_answer || null,
    feedback_wrong: block.feedback_wrong || null,
    checklist_items: (block.checklist_items ?? null) as Json,
    video_url: block.video_url || null,
    video_must_complete: Boolean(block.video_must_complete),
    code_command: block.code_command || null,
    code_expected_output: block.code_expected_output || null,
    points: block.points ?? 0,
    is_blocking: blockSupportsBlocking(block.type) ? Boolean(block.is_blocking) : false,
    order_index: orderIndex,
  };
}

function blockSupportsBlocking(type: BlockType) {
  return ["qcm", "text_answer", "url", "screenshot", "video", "checklist", "code_execute", "subtask"].includes(type);
}
