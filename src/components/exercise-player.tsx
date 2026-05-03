"use client";

import { useEffect, useMemo, useState } from "react";

import { submitExerciseAction } from "@/app/actions/exercises";
import { Badge, Card } from "@/components/ui";
import type { Exercise } from "@/types/database";

export function ExercisePlayer({ exercise, teamId }: { exercise: Exercise; teamId?: string }) {
  const [now, setNow] = useState(Date.now());
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const closesAt = exercise.closes_at ? Date.parse(exercise.closes_at) : Date.now();
  const activatedAt = exercise.activated_at ? Date.parse(exercise.activated_at) : closesAt - (exercise.time_limit_seconds ?? 0) * 1000;
  const total = Math.max(1, closesAt - activatedAt);
  const remaining = Math.max(0, closesAt - now);
  const ratio = remaining / total;
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  const tone = ratio > 0.5 ? "green" : ratio > 0.25 ? "yellow" : "red";
  const isClosed = remaining <= 0 || !exercise.is_active;
  const inputLabel = useMemo(() => {
    if (exercise.type === "debug") return "Correction proposée";
    if (exercise.type === "screenshot") return "URL du screenshot";
    return "Réponse";
  }, [exercise.type]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function submit(formData: FormData) {
    const response = await submitExerciseAction(formData);
    setMessage(response.error ?? (response.correct ? `Correct · ${response.points} pts${response.isFirst ? " · PREMIER" : ""}` : response.correct === false ? "Incorrect" : "Soumission enregistrée"));
  }

  return (
    <Card className="space-y-6 text-center">
      <div>
        <Badge tone={tone}>{exercise.type}</Badge>
        <h1 className="mt-4 font-display text-4xl font-bold">{exercise.title}</h1>
        <p className="mt-3 text-muted">{exercise.description}</p>
      </div>
      <div className={`font-display text-7xl font-bold ${tone === "green" ? "text-accent-green" : tone === "yellow" ? "text-accent-yellow" : "animate-pulse text-accent-red"}`}>
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </div>
      <p className="text-muted">{exercise.points ?? 0} pts · bonus premier {exercise.bonus_first ?? 0}</p>
      {isClosed ? (
        <p className="rounded-md border border-border bg-surface-2 p-4 text-muted">Aucun exercice actif en ce moment</p>
      ) : (
        <form action={submit} className="mx-auto max-w-2xl space-y-3 text-left">
          <input type="hidden" name="teamId" value={teamId ?? ""} />
          <input type="hidden" name="exerciseId" value={exercise.id} />
          <label className="space-y-2">
            <span className="text-sm text-muted">{inputLabel}</span>
            {exercise.type === "debug" ? (
              <textarea name="answer" value={answer} onChange={(event) => setAnswer(event.target.value)} className="min-h-36 w-full rounded-md border border-border bg-surface p-3" />
            ) : (
              <input name="answer" value={answer} onChange={(event) => setAnswer(event.target.value)} className="h-11 w-full rounded-md border border-border bg-surface px-3" />
            )}
          </label>
          {exercise.hint ? <details className="rounded-md border border-border bg-surface-2 p-3 text-sm text-muted"><summary>Voir l&apos;indice</summary><p className="mt-2">{exercise.hint}</p></details> : null}
          <button className="w-full rounded-md bg-primary px-4 py-3 font-semibold text-white hover:opacity-90" disabled={!teamId}>
            Soumettre ma réponse
          </button>
        </form>
      )}
      {message ? <p className="text-sm text-muted">{message}</p> : null}
    </Card>
  );
}
