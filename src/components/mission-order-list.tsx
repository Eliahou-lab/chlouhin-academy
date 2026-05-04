"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { duplicateMissionAction, reorderMissionsAction, toggleMissionPublishedAction } from "@/app/actions/missions";
import { Badge, Card } from "@/components/ui";
import type { Block, Mission } from "@/types/database";

export function MissionOrderList({ missions, blocks, adminSecret }: { missions: Mission[]; blocks: Block[]; adminSecret: string }) {
  const [items, setItems] = useState(missions);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    const next = arrayMove(items, oldIndex, newIndex).map((mission, index) => ({ ...mission, order_index: index + 1 }));
    setItems(next);
    setMessage("Sauvegarde de l'ordre...");
    startTransition(async () => {
      const response = await reorderMissionsAction({
        missionIds: next.map((mission) => mission.id),
        adminSecret,
      });
      setMessage(response.ok ? "Ordre sauvegardé." : "error" in response ? response.error : "Sauvegarde impossible.");
    });
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-muted">
        Glisse les missions pour choisir l&apos;enchaînement côté élèves. L&apos;ordre est sauvegardé automatiquement.
        {message ? <span className="ml-2 text-primary">{message}</span> : null}
        {isPending ? <span className="ml-2 text-accent-yellow">En cours...</span> : null}
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((mission) => mission.id)} strategy={verticalListSortingStrategy}>
          <div className="grid gap-3">
            {items.map((mission, index) => (
              <SortableMissionCard key={mission.id} mission={mission} index={index} blocks={blocks} adminSecret={adminSecret} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableMissionCard({ mission, index, blocks, adminSecret }: { mission: Mission; index: number; blocks: Block[]; adminSecret: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: mission.id });

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`space-y-4 ${isDragging ? "border-primary opacity-80" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button {...attributes} {...listeners} className="cursor-grab rounded-md border border-border bg-surface-2 p-2 text-muted hover:text-white" type="button" aria-label="Déplacer la mission">
            <GripVertical className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Sprint #{index + 1}</p>
            <h2 className="font-display text-xl font-bold">
              {mission.code} · {mission.title}
            </h2>
            <p className="text-sm text-muted">{blocks.filter((block) => block.mission_id === mission.id).length} blocs</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={mission.is_published ? "green" : "yellow"}>{mission.is_published ? "Publiee" : "Brouillon"}</Badge>
          <Badge tone={mission.is_locked ? "muted" : "green"}>{mission.is_locked ? "Verrouillee" : "Ouverte"}</Badge>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link className="rounded-md border border-border px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-white" href={`/admin/missions/${mission.id}`}>
          Editer
        </Link>
        <form action={toggleMissionPublishedAction}>
          <input type="hidden" name="adminSecret" value={adminSecret} />
          <input type="hidden" name="missionId" value={mission.id} />
          <input type="hidden" name="is_published" value={mission.is_published ? "false" : "true"} />
          <button className="rounded-md border border-border px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-white">
            {mission.is_published ? "Repasser en brouillon" : "Publier"}
          </button>
        </form>
        <form action={duplicateMissionAction} className="flex flex-wrap gap-2">
          <input type="hidden" name="adminSecret" value={adminSecret} />
          <input type="hidden" name="missionId" value={mission.id} />
          <input className="h-10 w-28 rounded-md border border-border bg-surface px-3 text-sm" name="newCode" placeholder={`${mission.code}-COPY`} required />
          <button className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:opacity-90">Dupliquer</button>
        </form>
      </div>
    </Card>
  );
}
