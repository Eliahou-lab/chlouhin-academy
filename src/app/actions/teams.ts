"use server";

import { revalidatePath } from "next/cache";

import { adminDenied, isAdminAuthorized } from "@/lib/admin-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function clean(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeAccessCode(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-");
}

export async function createTeamAction(formData: FormData) {
  if (!isAdminAuthorized(formData.get("adminSecret"))) {
    adminDenied();
    return;
  }

  const name = clean(formData.get("name"));
  const member1Name = clean(formData.get("member1_name"));
  const member2Name = clean(formData.get("member2_name"));
  const member3Name = clean(formData.get("member3_name"));
  const accessCode = normalizeAccessCode(formData.get("access_code"));

  if (!name || !member1Name || !member2Name || !accessCode) {
    console.error("[Team error]", "Nom, deux élèves minimum et code d'accès requis.");
    return;
  }

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.schema("academy").from("teams").insert({
    name,
    member1_name: member1Name,
    member2_name: member2Name,
    member3_name: member3Name,
    access_code: accessCode,
    avatar_emoji: clean(formData.get("avatar_emoji")) ?? "🚀",
    github_url: clean(formData.get("github_url")),
    vercel_url: clean(formData.get("vercel_url")),
    total_score: 0,
  });

  if (error) {
    console.error("[Supabase error]", error);
    return;
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/teams");
}

export async function updateTeamAction(formData: FormData) {
  if (!isAdminAuthorized(formData.get("adminSecret"))) {
    adminDenied();
    return;
  }

  const id = clean(formData.get("id"));
  const name = clean(formData.get("name"));
  const member1Name = clean(formData.get("member1_name"));
  const member2Name = clean(formData.get("member2_name"));
  const accessCode = normalizeAccessCode(formData.get("access_code"));

  if (!id || !name || !member1Name || !member2Name || !accessCode) {
    console.error("[Team error]", "Données équipe incomplètes.");
    return;
  }

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .schema("academy")
    .from("teams")
    .update({
      name,
      member1_name: member1Name,
      member2_name: member2Name,
      member3_name: clean(formData.get("member3_name")),
      access_code: accessCode,
      avatar_emoji: clean(formData.get("avatar_emoji")) ?? "🚀",
      github_url: clean(formData.get("github_url")),
      vercel_url: clean(formData.get("vercel_url")),
    })
    .eq("id", id);

  if (error) {
    console.error("[Supabase error]", error);
    return;
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/teams");
  revalidatePath(`/team/${id}`);
}

export async function verifyTeamAccessAction(payload: { teamId: string; accessCode: string }) {
  const teamId = String(payload.teamId ?? "").trim();
  const accessCode = normalizeAccessCode(payload.accessCode);

  if (!teamId || !accessCode) {
    return { ok: false, error: "Code d'accès requis." };
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.schema("academy").from("teams").select("id,access_code").eq("id", teamId).maybeSingle();

  if (error) {
    console.error("[Supabase error]", error);
    return { ok: false, error: "Impossible de vérifier le code." };
  }

  if (!data?.access_code || data.access_code !== accessCode) {
    return { ok: false, error: "Code incorrect." };
  }

  return { ok: true, teamId: data.id };
}
