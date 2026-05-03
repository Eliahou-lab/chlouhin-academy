"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { adminDenied, isAdminAuthorized } from "@/lib/admin-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Exercise } from "@/types/database";

type ExerciseType = Exercise["type"];

export async function createExerciseAction(formData: FormData) {
  if (!isAdminAuthorized(formData.get("adminSecret"))) return;

  const supabase = createAdminSupabaseClient();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const type = String(formData.get("type") ?? "quiz") as ExerciseType;
  const correctAnswer = String(formData.get("correct_answer") ?? "").trim();
  const points = Number(formData.get("points") ?? 50);
  const bonusFirst = Number(formData.get("bonus_first") ?? 20);
  const minutes = Number(formData.get("minutes") ?? 15);
  const hint = String(formData.get("hint") ?? "").trim();
  const activate = formData.get("activate") === "true";
  const now = new Date();

  if (!title || !description) return;

  if (activate) {
    await supabase.schema("academy").from("exercises").update({ is_active: false, closes_at: now.toISOString() }).eq("is_active", true);
  }

  const { data, error } = await supabase
    .schema("academy")
    .from("exercises")
    .insert({
      title,
      description,
      type,
      correct_answer: correctAnswer || null,
      points,
      bonus_first: bonusFirst,
      time_limit_seconds: minutes * 60,
      hint: hint || null,
      is_active: activate,
      activated_at: activate ? now.toISOString() : null,
      closes_at: activate ? new Date(now.getTime() + minutes * 60_000).toISOString() : null,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error) console.error("[Supabase error]", error);
    return;
  }

  revalidatePath("/admin");
  revalidatePath("/display");
  redirect(activate ? `/admin/exercise/${data.id}` : "/admin");
}

export async function submitExerciseAction(formData: FormData) {
  const supabase = createAdminSupabaseClient();
  const teamId = String(formData.get("teamId") ?? "");
  const exerciseId = String(formData.get("exerciseId") ?? "");
  const answer = String(formData.get("answer") ?? "").trim();

  if (!teamId || !exerciseId) return { ok: false, error: "Equipe ou exercice manquant" };

  const { data: exercise, error: exerciseError } = await supabase.schema("academy").from("exercises").select("*").eq("id", exerciseId).single();
  if (exerciseError || !exercise || !exercise.is_active) return { ok: false, error: "Aucun exercice actif en ce moment" };
  if (exercise.closes_at && Date.parse(exercise.closes_at) < Date.now()) return { ok: false, error: "Exercice clôturé" };

  const isCorrect = exercise.correct_answer ? normalize(answer) === normalize(exercise.correct_answer) : null;
  const firstCorrect = isCorrect
    ? await supabase.schema("academy").from("exercise_submissions").select("id").eq("exercise_id", exerciseId).eq("is_correct", true).limit(1)
    : { data: [] };
  const isFirst = Boolean(isCorrect && (firstCorrect.data ?? []).length === 0);
  const points = isCorrect ? (exercise.points ?? 0) + (isFirst ? exercise.bonus_first ?? 0 : 0) : 0;

  const existing = await supabase.schema("academy").from("exercise_submissions").select("id,points_earned").eq("team_id", teamId).eq("exercise_id", exerciseId).maybeSingle();
  const { error } = await supabase.schema("academy").from("exercise_submissions").upsert(
    {
      team_id: teamId,
      exercise_id: exerciseId,
      answer,
      is_correct: isCorrect,
      points_earned: existing.data?.points_earned ?? points,
      is_first: existing.data ? false : isFirst,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "team_id,exercise_id" },
  );

  if (!existing.data && points > 0) {
    await creditOnce(teamId, `exercise_${exerciseId}`, points);
  }

  revalidatePath(`/exercise/${exerciseId}`);
  revalidatePath("/display");
  return { ok: !error, correct: isCorrect, points, isFirst, error: error?.message };
}

export async function closeExerciseAction(formData: FormData) {
  if (!isAdminAuthorized(formData.get("adminSecret"))) return;

  const exerciseId = String(formData.get("exerciseId") ?? "");
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .schema("academy")
    .from("exercises")
    .update({ is_active: false, closes_at: new Date().toISOString() })
    .eq("id", exerciseId);

  revalidatePath(`/admin/exercise/${exerciseId}`);
  revalidatePath("/display");
  if (error) console.error("[Supabase error]", error);
}

async function creditOnce(teamId: string, reason: string, points: number) {
  const supabase = createAdminSupabaseClient();
  const existing = await supabase.schema("academy").from("score_history").select("id").eq("team_id", teamId).eq("reason", reason).maybeSingle();
  if (existing.data) return;
  await supabase.schema("academy").from("score_history").insert({ team_id: teamId, points, reason });
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}
