"use server";

import { revalidatePath } from "next/cache";

import { isAdminAuthorized } from "@/lib/admin-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function validateBlockProgressAction(formData: FormData) {
  if (!isAdminAuthorized(formData.get("adminSecret"))) return;

  const supabase = createAdminSupabaseClient();
  const progressId = String(formData.get("progressId"));
  const comment = String(formData.get("comment") ?? "");

  const current = await supabase.schema("academy").from("block_progress").select("*").eq("id", progressId).single();
  if (current.error || !current.data) return;
  if (current.data.status === "validated") return;
  if (!current.data.block_id || !current.data.team_id) return;

  const block = await supabase.schema("academy").from("blocks").select("*").eq("id", current.data.block_id).single();
  if (block.error || !block.data) return;

  const teamId = current.data.team_id;
  const blockId = block.data.id;
  const points = block.data.points ?? 0;

  const { error } = await supabase
    .schema("academy")
    .from("block_progress")
    .update({
      status: "validated",
      points_earned: points,
      formateur_comment: comment || null,
      validated_at: new Date().toISOString(),
    })
    .eq("id", progressId);

  if (!error && points > 0) {
    await creditOnce(teamId, `block_${blockId}`, points);
    await awardBadge(teamId, "first_blood");
  }

  revalidatePath("/admin/validate");
  revalidatePath("/display");
  if (error) console.error("[Supabase error]", error);
}

export async function rejectBlockProgressAction(formData: FormData) {
  if (!isAdminAuthorized(formData.get("adminSecret"))) return;

  const supabase = createAdminSupabaseClient();
  const progressId = String(formData.get("progressId"));
  const comment = String(formData.get("comment") ?? "").trim();
  if (!comment) return;

  await supabase
    .schema("academy")
    .from("block_progress")
    .update({
      status: "rejected",
      formateur_comment: comment,
    })
    .eq("id", progressId);

  revalidatePath("/admin/validate");
  revalidatePath("/display");
}

async function awardBadge(teamId: string, code: string) {
  const supabase = createAdminSupabaseClient();
  const badge = await supabase.schema("academy").from("badges").select("*").eq("code", code).maybeSingle();
  if (!badge.data) return;
  await supabase.schema("academy").from("team_badges").upsert(
    {
      team_id: teamId,
      badge_id: badge.data.id,
    },
    { onConflict: "team_id,badge_id" },
  );
}

async function creditOnce(teamId: string, reason: string, points: number) {
  const supabase = createAdminSupabaseClient();
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
