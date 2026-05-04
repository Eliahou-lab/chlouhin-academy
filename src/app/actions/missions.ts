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
  | "hint_text"
  | "hint_cost_points"
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
  mission: Pick<Mission, "id" | "code" | "title" | "persona" | "persona_scenario" | "display_mode" | "is_locked" | "is_published">;
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
      is_published: payload.mission.is_published,
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
  if (!isAdminAuthorized(formData.get("adminSecret"))) return { ok: false, error: "Non autorisé" };

  const supabase = createAdminSupabaseClient();
  const code = String(formData.get("code") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const persona = String(formData.get("persona") ?? "Aucun");
  const personaScenario = String(formData.get("persona_scenario") ?? "").trim();
  const displayMode = String(formData.get("display_mode") ?? "all_visible") as Mission["display_mode"];
  const orderIndex = Number(formData.get("order_index") ?? 99);
  const isLocked = formData.get("is_locked") === "on";

  if (!code || !title) return { ok: false, error: "Code et titre requis." };

  const existing = await supabase.schema("academy").from("missions").select("id").eq("code", code).maybeSingle();
  if (existing.error) {
    console.error("[Supabase error]", existing.error);
    return { ok: false, error: "Impossible de vérifier le code mission." };
  }
  if (existing.data) {
    return { ok: false, error: `Le code ${code} existe déjà. Utilise un autre code ou modifie la mission existante.` };
  }

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
      is_published: false,
      order_index: orderIndex,
      is_locked: isLocked,
      points_total: 0,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error) console.error("[Supabase error]", error);
    return { ok: false, error: error?.message ?? "Création impossible." };
  }

  revalidatePath("/admin/missions");
  redirect(`/admin/missions/${data.id}`);
}

export async function toggleMissionPublishedAction(formData: FormData) {
  if (!isAdminAuthorized(formData.get("adminSecret"))) return;
  const missionId = String(formData.get("missionId") ?? "");
  const isPublished = formData.get("is_published") === "true";
  if (!missionId) return;

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.schema("academy").from("missions").update({ is_published: isPublished }).eq("id", missionId);
  if (error) console.error("[Supabase error]", error);
  revalidatePath("/");
  revalidatePath("/admin/missions");
  revalidatePath(`/admin/missions/${missionId}`);
  revalidatePath("/display");
}

export async function reorderMissionsAction(payload: { missionIds: string[]; adminSecret?: string }) {
  if (!isAdminAuthorized(payload.adminSecret)) return adminDenied();

  const supabase = createAdminSupabaseClient();
  for (const [index, missionId] of payload.missionIds.entries()) {
    const { error } = await supabase
      .schema("academy")
      .from("missions")
      .update({ order_index: index + 1 })
      .eq("id", missionId);
    if (error) {
      console.error("[Supabase error]", error);
      return { ok: false, error: error.message };
    }
  }

  revalidatePath("/");
  revalidatePath("/admin/missions");
  revalidatePath("/display");
  return { ok: true };
}

export async function duplicateMissionAction(formData: FormData) {
  if (!isAdminAuthorized(formData.get("adminSecret"))) return;
  const missionId = String(formData.get("missionId") ?? "");
  const newCode = String(formData.get("newCode") ?? "").trim();
  if (!missionId || !newCode) return;

  const supabase = createAdminSupabaseClient();
  const existing = await supabase.schema("academy").from("missions").select("id").eq("code", newCode).maybeSingle();
  if (existing.data) {
    console.error("[Mission duplicate]", `Le code ${newCode} existe déjà.`);
    return;
  }

  const source = await supabase.schema("academy").from("missions").select("*").eq("id", missionId).single();
  if (source.error || !source.data) {
    if (source.error) console.error("[Supabase error]", source.error);
    return;
  }

  const { data: created, error: missionError } = await supabase
    .schema("academy")
    .from("missions")
    .insert({
      code: newCode,
      title: `${source.data.title} copie`,
      description: source.data.description,
      persona: source.data.persona,
      persona_scenario: source.data.persona_scenario,
      prompt_windsurf: source.data.prompt_windsurf,
      display_mode: source.data.display_mode ?? "all_visible",
      is_published: false,
      order_index: (source.data.order_index ?? 99) + 1,
      is_locked: true,
      points_total: source.data.points_total ?? 0,
    })
    .select("id")
    .single();

  if (missionError || !created) {
    if (missionError) console.error("[Supabase error]", missionError);
    return;
  }

  const sourceBlocks = await supabase.schema("academy").from("blocks").select("*").eq("mission_id", missionId).order("order_index");
  if (sourceBlocks.error) {
    console.error("[Supabase error]", sourceBlocks.error);
    return;
  }

  const idMap = new Map<string, string>();
  const blocks = sourceBlocks.data ?? [];
  blocks.forEach((block) => idMap.set(block.id, crypto.randomUUID()));

  for (const block of blocks) {
    const { error } = await supabase.schema("academy").from("blocks").insert({
      id: idMap.get(block.id),
      mission_id: created.id,
      parent_block_id: block.parent_block_id ? idMap.get(block.parent_block_id) ?? null : null,
      type: block.type,
      title: block.title,
      content: block.content,
      prompt_code: block.prompt_code,
      options: block.options,
      correct_answer: block.correct_answer,
      feedback_wrong: block.feedback_wrong,
      hint_text: block.hint_text,
      hint_cost_points: block.hint_cost_points,
      checklist_items: block.checklist_items,
      video_url: block.video_url,
      video_must_complete: block.video_must_complete,
      code_command: block.code_command,
      code_expected_output: block.code_expected_output,
      points: block.points,
      is_blocking: block.is_blocking,
      order_index: block.order_index,
    });
    if (error) console.error("[Supabase error]", error);
  }

  revalidatePath("/admin/missions");
  redirect(`/admin/missions/${created.id}`);
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
    hint_text: block.hint_text || null,
    hint_cost_points: block.hint_cost_points ?? 0,
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
