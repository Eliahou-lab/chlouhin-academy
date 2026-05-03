import type { Team } from "@/types/database";

export function teamMembers(team: Pick<Team, "member1_name" | "member2_name" | "member3_name">) {
  return [team.member1_name, team.member2_name, team.member3_name].filter(Boolean) as string[];
}

export function teamMembersLabel(team: Pick<Team, "member1_name" | "member2_name" | "member3_name">) {
  return teamMembers(team).join(" + ");
}
