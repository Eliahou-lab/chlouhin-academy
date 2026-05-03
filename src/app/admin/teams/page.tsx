import Link from "next/link";

import { createTeamAction, updateTeamAction } from "@/app/actions/teams";
import { Badge, Card, EmptyState, PageShell } from "@/components/ui";
import { getTeams } from "@/lib/data";
import { teamMembersLabel } from "@/lib/teams";

export const dynamic = "force-dynamic";

export default async function AdminTeamsPage() {
  const teams = await getTeams();
  const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "";

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="font-display text-xs uppercase text-primary">Roster control</p>
            <h1 className="font-display text-3xl font-bold">Équipes élèves</h1>
            <p className="mt-2 text-sm text-muted">Crée les équipes, leur constitution et leur code d&apos;accès.</p>
          </div>
          <Link className="rounded-md border border-border px-4 py-2 text-sm text-muted hover:bg-surface-2 hover:text-white" href="/admin">
            Retour admin
          </Link>
        </header>

        <Card className="space-y-4">
          <h2 className="font-display text-2xl font-bold">Créer une équipe</h2>
          <form action={createTeamAction} className="grid gap-3 lg:grid-cols-6">
            <input type="hidden" name="adminSecret" value={adminSecret} />
            <Field name="avatar_emoji" label="Emoji" placeholder="🚀" defaultValue="🚀" />
            <Field name="name" label="Nom équipe" placeholder="Team Alpha" required />
            <Field name="member1_name" label="Élève 1" placeholder="Prénom" required />
            <Field name="member2_name" label="Élève 2" placeholder="Prénom" required />
            <Field name="member3_name" label="Élève 3" placeholder="Optionnel" />
            <Field name="access_code" label="Code accès" placeholder="ALPHA-2026" required />
            <div className="lg:col-span-3">
              <Field name="github_url" label="GitHub" placeholder="https://github.com/..." />
            </div>
            <div className="lg:col-span-2">
              <Field name="vercel_url" label="Vercel" placeholder="https://..." />
            </div>
            <button className="self-end rounded-md bg-primary px-4 py-2 font-semibold text-white hover:opacity-90">Créer</button>
          </form>
        </Card>

        {teams.length === 0 ? <EmptyState title="Aucune équipe créée" /> : null}

        <section className="grid gap-4">
          {teams.map((team) => (
            <Card key={team.id} className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-bold">
                    {team.avatar_emoji ?? "🚀"} {team.name}
                  </h2>
                  <p className="text-sm text-muted">{teamMembersLabel(team)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="green">{team.total_score ?? 0} pts</Badge>
                  <Badge tone="indigo">Code: {team.access_code ?? "Non défini"}</Badge>
                </div>
              </div>

              <form action={updateTeamAction} className="grid gap-3 lg:grid-cols-6">
                <input type="hidden" name="adminSecret" value={adminSecret} />
                <input type="hidden" name="id" value={team.id} />
                <Field name="avatar_emoji" label="Emoji" defaultValue={team.avatar_emoji ?? "🚀"} />
                <Field name="name" label="Nom équipe" defaultValue={team.name} required />
                <Field name="member1_name" label="Élève 1" defaultValue={team.member1_name} required />
                <Field name="member2_name" label="Élève 2" defaultValue={team.member2_name} required />
                <Field name="member3_name" label="Élève 3" defaultValue={team.member3_name ?? ""} />
                <Field name="access_code" label="Code accès" defaultValue={team.access_code ?? ""} required />
                <div className="lg:col-span-3">
                  <Field name="github_url" label="GitHub" defaultValue={team.github_url ?? ""} />
                </div>
                <div className="lg:col-span-2">
                  <Field name="vercel_url" label="Vercel" defaultValue={team.vercel_url ?? ""} />
                </div>
                <button className="self-end rounded-md border border-border bg-surface-2 px-4 py-2 font-semibold hover:border-primary">Sauvegarder</button>
              </form>
            </Card>
          ))}
        </section>
      </div>
    </PageShell>
  );
}

function Field({
  name,
  label,
  placeholder,
  defaultValue,
  required = false,
}: {
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm text-muted">{label}</span>
      <input
        required={required}
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="h-11 w-full rounded-md border border-border bg-surface px-3 text-foreground outline-none focus:border-primary"
      />
    </label>
  );
}
