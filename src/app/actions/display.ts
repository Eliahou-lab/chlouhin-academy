"use server";

import { revalidatePath } from "next/cache";

import { isAdminAuthorized } from "@/lib/admin-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { DisplayMode } from "@/types/database";

export async function updateDisplayModeAction(formData: FormData) {
  if (!isAdminAuthorized(formData.get("adminSecret"))) return;

  const mode = String(formData.get("mode") ?? "") as DisplayMode;
  if (!["leaderboard", "scores", "exercise", "progress", "screenshots"].includes(mode)) {
    return;
  }

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .schema("academy")
    .from("display_state")
    .upsert({ id: 1, mode, updated_at: new Date().toISOString() }, { onConflict: "id" });

  revalidatePath("/display");
  revalidatePath("/admin/display");
  if (error) console.error("[Supabase error]", error);
}
