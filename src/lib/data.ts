import { cache } from "react";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { BadgeRow, Block, BlockProgress, DisplayState, Exercise, ExerciseSubmission, Mission, ScoreHistory, Team, TeamBadge } from "@/types/database";

const emptyDisplayState: DisplayState = {
  id: 1,
  mode: "leaderboard",
  updated_at: null,
};

async function read<T>(query: PromiseLike<{ data: T | null; error: unknown }>, fallback: T): Promise<T> {
  const { data, error } = await query;
  if (error) {
    console.error("[Supabase error]", error);
    return fallback;
  }
  return data ?? fallback;
}

export const getTeams = cache(async (): Promise<Team[]> => {
  const supabase = createServerSupabaseClient();
  return read(supabase.schema("academy").from("teams").select("*").order("total_score", { ascending: false }), []);
});

export type AdminDashboardTeam = Team & {
  score_history?: ScoreHistory[];
  activeMission: string;
};

type ActiveBlockRow = BlockProgress & {
  blocks?: (Block & { missions?: Pick<Mission, "code" | "title"> | null }) | null;
};

export const getAdminDashboardTeams = cache(async (): Promise<AdminDashboardTeam[]> => {
  const supabase = createServerSupabaseClient();
  const teams = await read<(Team & { score_history?: ScoreHistory[] })[]>(
    supabase.schema("academy").from("teams").select("*, score_history(*)").order("total_score", { ascending: false }),
    [],
  );

  return Promise.all(
    teams.map(async (team) => {
      const { data, error } = await supabase
        .schema("academy")
        .from("block_progress")
        .select("*, blocks(*, missions(code, title))")
        .eq("team_id", team.id)
        .eq("status", "in_progress")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) console.error("[Supabase error]", error);
      const activeBlock = data as ActiveBlockRow | null;
      const mission = activeBlock?.blocks?.missions;

      return {
        ...team,
        total_score: team.total_score ?? 0,
        activeMission: mission ? `${mission.code} ${mission.title}` : "Aucune mission en cours",
      };
    }),
  );
});

export const getMissions = cache(async (): Promise<Mission[]> => {
  const supabase = createServerSupabaseClient();
  return read(supabase.schema("academy").from("missions").select("*").order("order_index"), []);
});

export const getPublishedMissions = cache(async (): Promise<Mission[]> => {
  const supabase = createServerSupabaseClient();
  return read(supabase.schema("academy").from("missions").select("*").eq("is_published", true).order("order_index"), []);
});

export const getBlocks = cache(async (): Promise<Block[]> => {
  const supabase = createServerSupabaseClient();
  return read(supabase.schema("academy").from("blocks").select("*").order("order_index"), []);
});

export const getBlockProgress = cache(async (): Promise<BlockProgress[]> => {
  const supabase = createServerSupabaseClient();
  return read(supabase.schema("academy").from("block_progress").select("*").order("updated_at", { ascending: false }), []);
});

export const getExercises = cache(async (): Promise<Exercise[]> => {
  const supabase = createServerSupabaseClient();
  return read(supabase.schema("academy").from("exercises").select("*").order("created_at", { ascending: false }), []);
});

export const getExerciseSubmissions = cache(async (): Promise<ExerciseSubmission[]> => {
  const supabase = createServerSupabaseClient();
  return read(supabase.schema("academy").from("exercise_submissions").select("*").order("submitted_at"), []);
});

export const getDisplayState = cache(async (): Promise<DisplayState> => {
  const supabase = createServerSupabaseClient();
  const rows = await read(supabase.schema("academy").from("display_state").select("*").eq("id", 1).limit(1), []);
  return rows[0] ?? emptyDisplayState;
});

export const getBadges = cache(async (): Promise<BadgeRow[]> => {
  const supabase = createServerSupabaseClient();
  return read(supabase.schema("academy").from("badges").select("*").order("created_at"), []);
});

export const getTeamBadges = cache(async (): Promise<TeamBadge[]> => {
  const supabase = createServerSupabaseClient();
  return read(supabase.schema("academy").from("team_badges").select("*").order("earned_at", { ascending: false }), []);
});

export async function getTeamBundle(teamId: string) {
  const [teams, missions, blocks, progress, exercises, submissions, badges, teamBadges] = await Promise.all([
    getTeams(),
    getPublishedMissions(),
    getBlocks(),
    getBlockProgress(),
    getExercises(),
    getExerciseSubmissions(),
    getBadges(),
    getTeamBadges(),
  ]);
  return {
    team: teams.find((team) => team.id === teamId) ?? null,
    teams,
    missions,
    blocks,
    progress: progress.filter((item) => item.team_id === teamId),
    exercises,
    submissions,
    badges,
    teamBadges: teamBadges.filter((item) => item.team_id === teamId),
  };
}

export async function getMissionEditorBundle(missionId: string) {
  const [missions, blocks] = await Promise.all([getMissions(), getBlocks()]);
  return {
    mission: missions.find((mission) => mission.id === missionId) ?? null,
    blocks: blocks.filter((block) => block.mission_id === missionId).sort((a, b) => a.order_index - b.order_index),
  };
}
