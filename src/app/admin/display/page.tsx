import { updateDisplayModeAction } from "@/app/actions/display";
import { Badge, Card, PageShell } from "@/components/ui";
import { getDisplayState } from "@/lib/data";
import type { DisplayMode } from "@/types/database";

const modes: { mode: DisplayMode; label: string; emoji: string }[] = [
  { mode: "leaderboard", label: "Leaderboard", emoji: "🏆" },
  { mode: "scores", label: "Scores", emoji: "📊" },
  { mode: "exercise", label: "Exercice", emoji: "⚡" },
  { mode: "progress", label: "Progression", emoji: "📋" },
  { mode: "screenshots", label: "Screenshots", emoji: "🖼️" },
];

export default async function AdminDisplayPage() {
  const displayState = await getDisplayState();
  const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "";

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <h1 className="font-display text-4xl font-bold">Contrôle du rétroprojecteur</h1>
            <p className="mt-2 text-muted">Mode actuel : <Badge tone="green">{displayState.mode ?? "leaderboard"}</Badge></p>
          </div>
          <a className="rounded-md bg-primary px-4 py-2 font-semibold text-white hover:opacity-90" href="/display" target="_blank" rel="noreferrer">
            Ouvrir /display
          </a>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {modes.map((item) => (
            <Card key={item.mode} className={displayState.mode === item.mode ? "border-primary bg-primary/10" : ""}>
              <form action={updateDisplayModeAction}>
                <input type="hidden" name="adminSecret" value={adminSecret} />
                <input type="hidden" name="mode" value={item.mode} />
                <button className="flex w-full items-center gap-4 text-left" type="submit">
                  <span className="text-5xl">{item.emoji}</span>
                  <span>
                    <span className="block font-display text-2xl font-bold">{item.label}</span>
                    <span className="text-sm text-muted">Envoyer sur le projecteur</span>
                  </span>
                </button>
              </form>
            </Card>
          ))}
        </section>
      </div>
    </PageShell>
  );
}
