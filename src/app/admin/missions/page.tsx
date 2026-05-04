import Link from "next/link";

import { MissionOrderList } from "@/components/mission-order-list";
import { EmptyState, PageShell } from "@/components/ui";
import { getBlocks, getMissions } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminMissionsPage() {
  const [missions, blocks] = await Promise.all([getMissions(), getBlocks()]);
  const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "";

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex items-center justify-between border-b border-border pb-5">
          <h1 className="font-display text-3xl font-bold">Missions</h1>
          <div className="flex gap-3 text-sm">
            <Link className="text-muted hover:text-white" href="/admin">Admin</Link>
            <Link className="rounded-md bg-primary px-3 py-2 font-semibold text-white hover:opacity-90" href="/admin/missions/new">Nouvelle mission</Link>
          </div>
        </header>
        {missions.length === 0 ? <EmptyState title="Aucune mission Supabase" href="/admin" /> : null}
        <MissionOrderList missions={missions} blocks={blocks} adminSecret={adminSecret} />
      </div>
    </PageShell>
  );
}
