import { notFound } from "next/navigation";

import { closeExerciseAction } from "@/app/actions/exercises";
import { Badge, Card, PageShell } from "@/components/ui";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { getExerciseSubmissions, getExercises, getTeams } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminExercisePage({ params }: { params: { id: string } }) {
  const [exercises, submissions, teams] = await Promise.all([getExercises(), getExerciseSubmissions(), getTeams()]);
  const exercise = exercises.find((item) => item.id === params.id);
  if (!exercise) notFound();
  const rows = submissions.filter((item) => item.exercise_id === exercise.id);
  const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "";

  return (
    <PageShell>
      <RealtimeRefresh tables={["exercise_submissions", "exercises", "score_history"]} />
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <Badge tone={exercise.is_active ? "green" : "muted"}>{exercise.is_active ? "Actif" : "Clos"}</Badge>
            <h1 className="mt-3 font-display text-4xl font-bold">{exercise.title}</h1>
            <p className="mt-2 text-muted">{exercise.description}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4 text-right">
            <p className="text-sm text-muted">Clôture</p>
            <p className="font-display text-xl">{exercise.closes_at ? new Date(exercise.closes_at).toLocaleTimeString("fr-FR") : "Non planifiée"}</p>
            {exercise.is_active ? (
              <form action={closeExerciseAction} className="mt-4">
                <input type="hidden" name="adminSecret" value={adminSecret} />
                <input type="hidden" name="exerciseId" value={exercise.id} />
                <button className="rounded-md border border-accent-red px-3 py-2 text-sm text-accent-red hover:bg-accent-red/10">Clôturer l&apos;exercice</button>
              </form>
            ) : null}
          </div>
        </header>

        <Card>
          <h2 className="font-display text-2xl font-bold">Soumissions temps réel</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="border-b border-border p-3">Équipe</th>
                  <th className="border-b border-border p-3">Heure</th>
                  <th className="border-b border-border p-3">Réponse</th>
                  <th className="border-b border-border p-3">Statut</th>
                  <th className="border-b border-border p-3">Points</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const team = teams.find((item) => item.id === row.team_id);
                  return (
                    <tr key={row.id}>
                      <td className="border-b border-border p-3">{team?.name ?? "Équipe inconnue"}</td>
                      <td className="border-b border-border p-3">{row.submitted_at ? new Date(row.submitted_at).toLocaleTimeString("fr-FR") : "-"}</td>
                      <td className="border-b border-border p-3">{row.answer ?? row.screenshot_url ?? "-"}</td>
                      <td className="border-b border-border p-3"><Badge tone={row.is_correct ? "green" : row.is_correct === false ? "red" : "yellow"}>{row.is_correct === null ? "En attente" : row.is_correct ? "Correct" : "Incorrect"}</Badge></td>
                      <td className="border-b border-border p-3">{row.points_earned ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
