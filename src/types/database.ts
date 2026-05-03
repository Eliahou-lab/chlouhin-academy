export type BlockType =
  | "rich_content"
  | "theory"
  | "qcm"
  | "text_answer"
  | "url"
  | "screenshot"
  | "prompt"
  | "video"
  | "checklist"
  | "code_execute"
  | "separator"
  | "subtask";

export type BlockProgressStatus = "locked" | "in_progress" | "completed" | "correct" | "submitted" | "validated" | "rejected";
export type DisplayMode = "leaderboard" | "scores" | "exercise" | "progress" | "screenshots";
export type MissionDisplayMode = "all_visible" | "progressive" | "sections" | "free";
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

export type Team = {
  id: string;
  name: string;
  member1_name: string;
  member2_name: string;
  member3_name: string | null;
  access_code: string | null;
  github_url: string | null;
  vercel_url: string | null;
  avatar_emoji: string | null;
  total_score: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export type Mission = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  persona: string | null;
  persona_scenario: string | null;
  prompt_windsurf: string | null;
  display_mode: MissionDisplayMode | null;
  is_published: boolean | null;
  order_index: number;
  is_locked: boolean | null;
  points_total: number | null;
  created_at: string | null;
};

export type Block = {
  id: string;
  mission_id: string | null;
  parent_block_id: string | null;
  type: BlockType;
  title: string | null;
  content: string | null;
  prompt_code: string | null;
  options: Json | null;
  correct_answer: string | null;
  feedback_wrong: string | null;
  checklist_items: Json | null;
  video_url: string | null;
  video_must_complete: boolean | null;
  code_command: string | null;
  code_expected_output: string | null;
  points: number | null;
  is_blocking: boolean | null;
  order_index: number;
  created_at: string | null;
  updated_at: string | null;
};

export type BlockProgress = {
  id: string;
  team_id: string | null;
  block_id: string | null;
  mission_id: string | null;
  status: BlockProgressStatus | null;
  answer: string | null;
  screenshot_urls: string[] | null;
  checklist_state: Json | null;
  attempts: number | null;
  points_earned: number | null;
  team_comment: string | null;
  formateur_comment: string | null;
  started_at: string | null;
  completed_at: string | null;
  submitted_at: string | null;
  validated_at: string | null;
  duration_seconds: number | null;
  needs_help: boolean | null;
  help_message: string | null;
  help_requested_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type Exercise = {
  id: string;
  title: string;
  description: string;
  type: "find_api" | "debug" | "quiz" | "screenshot" | "url";
  correct_answer: string | null;
  points: number | null;
  bonus_first: number | null;
  time_limit_seconds: number | null;
  hint: string | null;
  is_active: boolean | null;
  activated_at: string | null;
  closes_at: string | null;
  created_at: string | null;
};

export type ExerciseSubmission = {
  id: string;
  team_id: string | null;
  exercise_id: string | null;
  answer: string | null;
  screenshot_url: string | null;
  is_correct: boolean | null;
  points_earned: number | null;
  is_first: boolean | null;
  submitted_at: string | null;
};

export type DisplayState = {
  id: number;
  mode: DisplayMode | null;
  updated_at: string | null;
};

export type BadgeRow = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  emoji: string;
  points_bonus: number | null;
  created_at: string | null;
};

export type TeamBadge = {
  id: string;
  team_id: string | null;
  badge_id: string | null;
  earned_at: string | null;
};

export type ScoreHistory = {
  id: string;
  team_id: string | null;
  points: number;
  reason: string;
  created_at: string | null;
};

type Table<T> = {
  Row: T;
  Insert: Partial<T>;
  Update: Partial<T>;
  Relationships: [];
};

export type Database = {
  academy: {
    Tables: {
      teams: Table<Team>;
      missions: Table<Mission>;
      blocks: Table<Block>;
      block_progress: Table<BlockProgress>;
      exercises: Table<Exercise>;
      exercise_submissions: Table<ExerciseSubmission>;
      score_history: Table<ScoreHistory>;
      announcements: Table<{ id: string; title: string; content: string | null; type: string | null; is_active: boolean | null; created_at: string | null }>;
      badges: Table<BadgeRow>;
      team_badges: Table<TeamBadge>;
      display_state: Table<DisplayState>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
