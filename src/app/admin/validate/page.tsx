import { rejectBlockProgressAction, validateBlockProgressAction } from "@/app/actions/validation";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { Badge, Card, EmptyState, PageShell } from "@/components/ui";
import { getBlockProgress, getBlocks, getMissions, getTeams } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ValidatePage() {
  const [teams, missions, blocks, progress] = await Promise.all([getTeams(), getMissions(), getBlocks(), getBlockProgress()]);
  const submitted = progress.filter((item) => item.status === "submitted");
  const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "";

  return (
    <PageShell>
      <RealtimeRefresh tables={["block_progress"]} />
      <div className="mx-auto max-w-6xl space-y-5">
        <h1 className="font-display text-3xl font-bold">Soumissions a valider</h1>
        {submitted.length === 0 ? <EmptyState title="Aucune soumission en attente" href="/admin" /> : null}
        {submitted.map((item) => {
	          const team = teams.find((candidate) => candidate.id === item.team_id);
	          const mission = missions.find((candidate) => candidate.id === item.mission_id);
	          const block = blocks.find((candidate) => candidate.id === item.block_id);
	          const parentBlock = block?.parent_block_id ? blocks.find((candidate) => candidate.id === block.parent_block_id) : null;
	          return (
            <Card key={item.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-bold">{team?.avatar_emoji ?? "🚀"} {team?.name ?? "Equipe inconnue"}</h2>
	                  <p className="text-muted">
	                    {mission?.code ?? "-"} · {mission?.title ?? "Mission inconnue"}
	                    {parentBlock ? ` → ${parentBlock.title ?? "Sous-tâche"}` : ""}
	                    {" → "}
	                    {block?.title ?? "Bloc inconnu"}
	                  </p>
                  {item.team_comment ? <p className="mt-3 text-sm text-foreground">{item.team_comment}</p> : null}
                </div>
                <Badge tone="yellow">{block?.points ?? 0} pts</Badge>
              </div>
              {item.screenshot_urls?.length ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {item.screenshot_urls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border border-border bg-surface-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="Screenshot soumis" className="aspect-video w-full object-cover" />
                    </a>
                  ))}
                </div>
              ) : null}
              <div className="mt-4 grid gap-3 md:grid-cols-2">
	                <form action={validateBlockProgressAction} className="space-y-2">
	                  <input type="hidden" name="adminSecret" value={adminSecret} />
	                  <input type="hidden" name="progressId" value={item.id} />
	                  <textarea name="comment" className="min-h-20 w-full rounded-md border border-border bg-surface p-3" placeholder="Commentaire optionnel" />
	                  <button className="w-full rounded-md bg-accent-green px-4 py-2 font-semibold text-black">Valider</button>
	                </form>
	                <form action={rejectBlockProgressAction} className="space-y-2">
	                  <input type="hidden" name="adminSecret" value={adminSecret} />
	                  <input type="hidden" name="progressId" value={item.id} />
                  <textarea name="comment" required className="min-h-20 w-full rounded-md border border-accent-red bg-surface p-3" placeholder="Commentaire obligatoire" />
                  <button className="w-full rounded-md bg-accent-red px-4 py-2 font-semibold">Refuser</button>
                </form>
              </div>
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}
