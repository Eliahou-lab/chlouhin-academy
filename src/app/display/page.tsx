import { Badge, Card, EmptyState, PageShell, ProgressBar } from "@/components/ui";
import { LeaderboardRows } from "@/components/leaderboard-rows";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { getBlockProgress, getBlocks, getDisplayState, getExerciseSubmissions, getExercises, getMissions, getTeams } from "@/lib/data";
import { missionProgress } from "@/lib/progress";
import type { BlockProgressStatus, DisplayMode } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function DisplayPage({ searchParams }: { searchParams: { mode?: DisplayMode } }) {
  const [teams, missions, blocks, progress, exercises, submissions, displayState] = await Promise.all([
    getTeams(),
    getMissions(),
    getBlocks(),
    getBlockProgress(),
    getExercises(),
    getExerciseSubmissions(),
    getDisplayState(),
  ]);
  const mode = searchParams.mode ?? displayState.mode ?? "leaderboard";
  const sorted = [...teams].sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0));
  const activeExercise = exercises.find((exercise) => exercise.is_active);

  return (
    <PageShell>
      <RealtimeRefresh tables={["block_progress", "score_history", "display_state", "team_badges"]} />
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex items-center justify-between border-b border-border pb-5">
          <h1 className="font-display text-5xl font-bold">ChlouhIN Academy</h1>
          <Badge tone="green">LIVE · {mode}</Badge>
        </header>

        {sorted.length === 0 ? <EmptyState title="Aucune donnee display" /> : null}

        {mode === "exercise" ? (
          <Card className="text-center">
            <h2 className="font-display text-5xl font-bold">{activeExercise?.title ?? "Aucun exercice actif"}</h2>
            <p className="mt-4 text-3xl text-muted">{submissions.filter((item) => item.exercise_id === activeExercise?.id).length} reponses</p>
          </Card>
        ) : mode === "scores" ? (
          <div className="space-y-6">
            <div className="grid items-end gap-4 md:grid-cols-3">
              {sorted.slice(0, 3).map((team, index) => (
                <Card key={team.id} className={`text-center ${index === 0 ? "md:order-2 border-accent-yellow py-14" : index === 1 ? "md:order-1 py-10" : "md:order-3 py-8"}`}>
                  <p className="font-display text-6xl">#{index + 1}</p>
                  <p className="mt-3 text-5xl">{team.avatar_emoji ?? "🚀"}</p>
                  <h2 className="mt-3 font-display text-3xl font-bold">{team.name}</h2>
                  <p className="mt-3 font-display text-5xl text-accent-green">{team.total_score ?? 0}</p>
                </Card>
              ))}
            </div>
            <Card>
              <table className="w-full text-left">
                <tbody>
                  {sorted.map((team, index) => (
                    <tr key={team.id}>
                      <td className="border-b border-border p-4 font-display text-2xl">#{index + 1}</td>
                      <td className="border-b border-border p-4 text-2xl">{team.avatar_emoji ?? "🚀"} {team.name}</td>
                      <td className="border-b border-border p-4 text-right font-display text-3xl">{team.total_score ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        ) : mode === "progress" ? (
          <div className="grid gap-3">
            {teams.map((team) => (
              <Card key={team.id}>
                <h2 className="font-display text-xl">{team.avatar_emoji ?? "🚀"} {team.name}</h2>
                <div className="mt-4 grid grid-cols-5 gap-2 md:grid-cols-11">
                  {missions.map((mission) => {
                    const state = missionProgress(mission, blocks, progress.filter((item) => item.team_id === team.id));
                    return <div key={mission.id} className={`rounded-md border p-3 text-center text-xs ${statusCell(state.status)}`}>{mission.code}<br />{statusEmoji(state.status)}</div>;
                  })}
                </div>
              </Card>
            ))}
          </div>
        ) : mode === "screenshots" ? (
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
            {latestScreenshots(progress).map((item) => {
              const team = teams.find((candidate) => candidate.id === item.teamId);
              return (
                <Card key={item.url} className="overflow-hidden p-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt="Screenshot soumis" className="aspect-video w-full object-cover" />
                  <div className="p-3">
                    <p className="font-display text-sm">{team?.avatar_emoji ?? "🚀"} {team?.name ?? "Equipe"}</p>
                    <p className="text-xs text-muted">{new Date(item.updatedAt).toLocaleTimeString("fr-FR")}</p>
                  </div>
                </Card>
              );
            })}
            {latestScreenshots(progress).length === 0 ? <EmptyState title="Aucun screenshot soumis" /> : null}
          </div>
        ) : (
          <LeaderboardRows teams={sorted} missions={missions} blocks={blocks} progress={progress} />
        )}
      </div>
    </PageShell>
  );
}

function latestScreenshots(progress: Awaited<ReturnType<typeof getBlockProgress>>) {
  return progress
    .flatMap((item) => (item.screenshot_urls ?? []).map((url) => ({ url, teamId: item.team_id, updatedAt: item.updated_at ?? item.submitted_at ?? item.created_at ?? new Date(0).toISOString() })))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 12);
}

function statusCell(status: BlockProgressStatus) {
  if (status === "validated" || status === "completed" || status === "correct") return "border-accent-green bg-accent-green/15 text-accent-green";
  if (status === "submitted") return "border-accent-yellow bg-accent-yellow/15 text-accent-yellow";
  if (status === "rejected") return "border-accent-red bg-accent-red/15 text-accent-red";
  if (status === "in_progress") return "border-primary bg-primary/15 text-indigo-200";
  return "border-border bg-surface-2 text-muted";
}

function statusEmoji(status: BlockProgressStatus) {
  if (status === "validated" || status === "completed" || status === "correct") return "🟢 Validé";
  if (status === "submitted") return "🟡 Soumis";
  if (status === "rejected") return "🔴 Refusé";
  if (status === "in_progress") return "🔵 En cours";
  return "⚫ Verrouillé";
}
