import { notFound } from "next/navigation";

import { ExercisePlayer } from "@/components/exercise-player";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { EmptyState, PageShell } from "@/components/ui";
import { getExercises } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ExercisePage({ params, searchParams }: { params: { id: string }; searchParams: { teamId?: string } }) {
  const exercises = await getExercises();
  const exercise = exercises.find((item) => item.id === params.id);
  if (!exercise) notFound();

  return (
    <PageShell>
      <RealtimeRefresh tables={["exercises", "exercise_submissions", "score_history"]} />
      <div className="mx-auto max-w-5xl">
        {exercise.is_active ? <ExercisePlayer exercise={exercise} teamId={searchParams.teamId} /> : <EmptyState title="Aucun exercice actif en ce moment" />}
      </div>
    </PageShell>
  );
}
