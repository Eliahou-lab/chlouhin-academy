import { notFound } from "next/navigation";

import { MissionBlockEditor } from "@/components/mission-block-editor";
import { PageShell } from "@/components/ui";
import { getMissionEditorBundle } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function EditMissionPage({ params }: { params: { id: string } }) {
  const { mission, blocks } = await getMissionEditorBundle(params.id);
  if (!mission) notFound();

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl space-y-5">
        <h1 className="font-display text-3xl font-bold">Builder de mission</h1>
        <MissionBlockEditor mission={mission} blocks={blocks} />
      </div>
    </PageShell>
  );
}
