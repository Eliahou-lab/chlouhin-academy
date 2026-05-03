"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { verifyTeamAccessAction } from "@/app/actions/teams";
import { Badge, Card, ProgressBar } from "@/components/ui";
import { teamMembersLabel } from "@/lib/teams";
import type { AdminDashboardTeam } from "@/lib/data";

type TeamCard = AdminDashboardTeam & {
  rank: number;
  progressLabel: string;
  progressPercent: number;
};

export function TeamAccessGrid({ teams }: { teams: TeamCard[] }) {
  const router = useRouter();
  const [selectedTeam, setSelectedTeam] = useState<TeamCard | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function verify() {
    if (!selectedTeam) return;
    setError(null);
    startTransition(async () => {
      const response = await verifyTeamAccessAction({
        teamId: selectedTeam.id,
        accessCode,
      });
      if (!response.ok) {
        setError(response.error ?? "Code incorrect.");
        return;
      }
      router.push(`/team/${selectedTeam.id}`);
    });
  }

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {teams.map((team) => (
          <button key={team.id} className="text-left" onClick={() => {
            setSelectedTeam(team);
            setAccessCode("");
            setError(null);
          }}>
            <Card className="h-full transition hover:border-primary">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <p className="text-4xl">{team.avatar_emoji ?? "🚀"}</p>
                  <h2 className="mt-2 font-display text-xl font-bold">{team.name}</h2>
                  <p className="text-sm text-muted">{teamMembersLabel(team)}</p>
                </div>
                <Badge tone={team.rank === 1 ? "green" : "indigo"}>#{team.rank}</Badge>
              </div>
              <p className="font-display text-4xl font-bold">{team.total_score ?? 0} pts</p>
              <div className="mt-5 space-y-2">
                <div className="flex justify-between text-xs text-muted">
                  <span>Progression</span>
                  <span>{team.progressLabel}</span>
                </div>
                <ProgressBar value={team.progressPercent} />
              </div>
              <p className="mt-4 text-sm text-muted">Mission active: {team.activeMission}</p>
            </Card>
          </button>
        ))}
      </section>

      {selectedTeam ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <Card className="w-full max-w-md border-primary/40 bg-surface-2 shadow-2xl">
            <div className="space-y-4">
              <div>
                <p className="text-4xl">{selectedTeam.avatar_emoji ?? "🚀"}</p>
                <h2 className="mt-3 font-display text-2xl font-bold">{selectedTeam.name}</h2>
                <p className="text-sm text-muted">{teamMembersLabel(selectedTeam)}</p>
              </div>
              <label className="space-y-2">
                <span className="text-sm text-muted">Code d&apos;accès équipe</span>
                <input
                  autoFocus
                  className="h-12 w-full rounded-md border border-border bg-surface px-3 font-display text-lg uppercase tracking-[0.15em] text-foreground outline-none focus:border-primary"
                  value={accessCode}
                  placeholder="ALPHA-2026"
                  onChange={(event) => setAccessCode(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") verify();
                    if (event.key === "Escape") setSelectedTeam(null);
                  }}
                />
              </label>
              {error ? <p className="rounded-md border border-accent-red/40 bg-accent-red/10 p-3 text-sm text-accent-red">{error}</p> : null}
              <div className="flex gap-3">
                <button className="flex-1 rounded-md border border-border px-4 py-2 text-sm text-muted hover:bg-surface hover:text-white" onClick={() => setSelectedTeam(null)}>
                  Annuler
                </button>
                <button className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50" disabled={isPending} onClick={verify}>
                  {isPending ? "Vérification..." : "Entrer"}
                </button>
              </div>
              <p className="text-xs text-muted">Le code est donné par le formateur dans /admin/teams.</p>
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}
