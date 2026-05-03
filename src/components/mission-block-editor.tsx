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
import { ArrowDown, ArrowUp, Copy, GripVertical, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { saveMissionBuilderAction, type EditableBlock } from "@/app/actions/missions";
import { MarkdownPreview } from "@/components/markdown-preview";
import { Badge, Card } from "@/components/ui";
import { BlockIcon, blockLabel, blockTypes, isBlockingCapable } from "@/lib/blocks";
import type { Block, BlockType, Json, Mission, MissionDisplayMode } from "@/types/database";

type DraftBlock = EditableBlock & { localId: string };
type Option = { label: string; isCorrect: boolean };
type ChecklistItem = { id: string; label: string };
type RichContentKind = "markdown" | "terminal" | "prompt" | "aside" | "section" | "quote" | "divider";
type RichContentItem = {
  id: string;
  type: RichContentKind;
  title?: string;
  content?: string;
};

export function MissionBlockEditor({ mission, blocks }: { mission: Mission; blocks: Block[] }) {
  const [isPending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(blocks[0]?.id ?? null);
  const [missionDraft, setMissionDraft] = useState({
    id: mission.id,
    code: mission.code,
    title: mission.title,
    persona: mission.persona ?? "Aucun",
    persona_scenario: mission.persona_scenario ?? "",
    display_mode: mission.display_mode ?? "all_visible",
    is_locked: mission.is_locked ?? true,
  });
  const [draftBlocks, setDraftBlocks] = useState<DraftBlock[]>(
    blocks.map((block) => ({
      ...toEditableBlock(block),
      localId: block.id,
    })),
  );
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const selected = draftBlocks.find((block) => block.localId === selectedId) ?? draftBlocks[0] ?? null;
  const rootBlocks = sortSiblings(draftBlocks.filter((block) => !block.parent_block_id));
  const pointsTotal = draftBlocks.filter((block) => block.type !== "subtask").reduce((sum, block) => sum + (block.points ?? 0), 0);

  function save() {
    startTransition(async () => {
      const response = await saveMissionBuilderAction({
        mission: missionDraft,
        blocks: normalizeOrder(draftBlocks).map(({ localId, ...block }) => ({ ...block, id: block.id ?? localId })),
        adminSecret: process.env.NEXT_PUBLIC_ADMIN_SECRET,
      });
      if (response.ok) setSavedAt(new Date());
    });
  }

  useEffect(() => {
    const interval = window.setInterval(save, 30000);
    return () => window.clearInterval(interval);
  });

  function addBlock(type: BlockType, parentBlockId: string | null = null) {
    const config = blockTypes.find((item) => item.type === type);
    const siblingCount = draftBlocks.filter((block) => (block.parent_block_id ?? null) === parentBlockId).length;
    const block = newBlock(type, config?.defaultTitle ?? blockLabel(type), siblingCount + 1, parentBlockId);
    setDraftBlocks((current) => [...current, block]);
    setSelectedId(block.localId);
  }

  function updateSelected(patch: Partial<DraftBlock>) {
    if (!selected) return;
    setDraftBlocks((current) => current.map((block) => (block.localId === selected.localId ? { ...block, ...patch } : block)));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDraftBlocks((items) => {
      const oldIndex = items.findIndex((item) => item.localId === active.id);
      const newIndex = items.findIndex((item) => item.localId === over.id);
      const activeBlock = items[oldIndex];
      const overBlock = items[newIndex];
      if (!activeBlock || !overBlock || (activeBlock.parent_block_id ?? null) !== (overBlock.parent_block_id ?? null)) return items;
      const siblings = sortSiblings(items.filter((item) => (item.parent_block_id ?? null) === (activeBlock.parent_block_id ?? null)));
      const siblingOldIndex = siblings.findIndex((item) => item.localId === active.id);
      const siblingNewIndex = siblings.findIndex((item) => item.localId === over.id);
      const moved = arrayMove(siblings, siblingOldIndex, siblingNewIndex).map((item, index) => ({ ...item, order_index: index + 1 }));
      return items.map((item) => moved.find((candidate) => candidate.localId === item.localId) ?? item);
    });
  }

  function duplicateBlock(block: DraftBlock) {
    const nextId = crypto.randomUUID();
    const duplicate = { ...block, id: nextId, localId: nextId, title: `${block.title ?? blockLabel(block.type)} copie` };
    const children = draftBlocks.filter((item) => item.parent_block_id === block.localId);
    if (block.type !== "subtask" || children.length === 0) {
      setDraftBlocks((current) => [...current, duplicate]);
      setSelectedId(duplicate.localId);
      return;
    }
    const duplicatedChildren = children.map((child) => {
      const childId = crypto.randomUUID();
      return { ...child, id: childId, localId: childId, parent_block_id: nextId };
    });
    setDraftBlocks((current) => [...current, duplicate, ...duplicatedChildren]);
    setSelectedId(duplicate.localId);
  }

  function deleteBlock(block: DraftBlock) {
    const childIds = new Set(draftBlocks.filter((item) => item.parent_block_id === block.localId).map((item) => item.localId));
    setDraftBlocks((current) => current.filter((item) => item.localId !== block.localId && !childIds.has(item.localId)));
    if (selectedId === block.localId || childIds.has(selectedId ?? "")) setSelectedId(null);
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Code" value={missionDraft.code} onChange={(code) => setMissionDraft((current) => ({ ...current, code }))} />
          <Field label="Titre" value={missionDraft.title} onChange={(title) => setMissionDraft((current) => ({ ...current, title }))} />
          <label className="space-y-2">
            <span className="text-sm text-muted">Persona</span>
            <select
              className="h-11 w-full rounded-md border border-border bg-surface px-3"
              value={missionDraft.persona}
              onChange={(event) => setMissionDraft((current) => ({ ...current, persona: event.target.value }))}
            >
              <option>Mendel</option>
              <option>Sarah</option>
              <option>Yossi</option>
              <option>Aucun</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm text-muted">Affichage élèves</span>
            <select
              className="h-11 w-full rounded-md border border-border bg-surface px-3"
              value={missionDraft.display_mode}
              onChange={(event) => setMissionDraft((current) => ({ ...current, display_mode: event.target.value as MissionDisplayMode }))}
            >
              <option value="all_visible">Tout visible</option>
              <option value="progressive">Révélation progressive</option>
              <option value="sections">Par sections / sous-tâches</option>
              <option value="free">Libre sans blocage</option>
            </select>
          </label>
          <div>
            <p className="text-sm text-muted">Points total</p>
            <p className="font-display text-3xl">{pointsTotal}</p>
          </div>
        </div>
        <textarea
          className="min-h-20 w-full rounded-md border border-border bg-surface p-3"
          value={missionDraft.persona_scenario}
          placeholder="Scenario persona"
          onChange={(event) => setMissionDraft((current) => ({ ...current, persona_scenario: event.target.value }))}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!missionDraft.is_locked}
              onChange={(event) => setMissionDraft((current) => ({ ...current, is_locked: !event.target.checked }))}
            />
            Mission deverrouillee
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <a className="rounded-md border border-border px-4 py-2 text-sm" href={`/preview/${mission.id}`} target="_blank" rel="noreferrer">
              Previsualiser
            </a>
            <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold" onClick={save} disabled={isPending}>
              <Save className="h-4 w-4" />
              {isPending ? "Sauvegarde..." : "Sauvegarder"}
            </button>
            <span className="text-xs text-muted">{savedAt ? `Sauvegarde il y a ${Math.max(0, Math.round((Date.now() - savedAt.getTime()) / 1000))}s` : "Non sauvegarde"}</span>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(320px,40%)_1fr]">
        <Card className="space-y-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={rootBlocks.map((block) => block.localId)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {rootBlocks.map((block) =>
                  block.type === "subtask" ? (
                    <SubtaskEditorCard
                      key={block.localId}
                      block={block}
                      childrenBlocks={sortSiblings(draftBlocks.filter((item) => item.parent_block_id === block.localId))}
                      selectedId={selected?.localId ?? null}
                      onSelect={setSelectedId}
                      onDuplicate={duplicateBlock}
                      onDelete={deleteBlock}
                      onAddChild={(type) => addBlock(type, block.localId)}
                    />
                  ) : (
                    <SortableBlockCard
                      key={block.localId}
                      block={block}
                      selected={block.localId === selected?.localId}
                      onSelect={() => setSelectedId(block.localId)}
                      onDuplicate={() => duplicateBlock(block)}
                      onDelete={() => deleteBlock(block)}
                    />
                  ),
                )}
              </div>
            </SortableContext>
          </DndContext>
          <p className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-muted">
            Tu peux ajouter autant de blocs Prompt Windsurf que nécessaire. Chaque prompt est un bloc indépendant, duplicable et réordonnable.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {blockTypes.map((item) => (
              <button key={item.type} className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-left text-xs hover:border-primary" onClick={() => addBlock(item.type)}>
                <Plus className="h-3 w-3" />
                {item.label}
              </button>
            ))}
          </div>
        </Card>

        <Card>{selected ? <BlockForm block={selected} onChange={updateSelected} /> : <p className="text-muted">Ajoute ou selectionne un bloc.</p>}</Card>
      </div>
    </div>
  );
}

function SortableBlockCard({
  block,
  selected,
  onSelect,
  onDuplicate,
  onDelete,
}: {
  block: DraftBlock;
  selected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.localId });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-md border p-3 ${selected ? "border-primary bg-primary/10" : "border-border bg-surface-2"}`}
    >
      <button className="flex w-full items-center gap-3 text-left" onClick={onSelect}>
        <span {...attributes} {...listeners} className="cursor-grab rounded border border-border p-1">
          <GripVertical className="h-4 w-4" />
        </span>
        <BlockIcon type={block.type} className="h-4 w-4 text-primary" />
        <span className="min-w-0 flex-1 truncate font-display text-sm">{block.title || blockLabel(block.type)}</span>
        <Badge tone={block.points ? "green" : "muted"}>{block.points ?? 0}</Badge>
      </button>
      <div className="mt-3 flex gap-2 pl-10">
        <button className="rounded border border-border p-1 text-muted hover:text-white" onClick={onDuplicate}>
          <Copy className="h-4 w-4" />
        </button>
        <button className="rounded border border-border p-1 text-muted hover:text-accent-red" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function SubtaskEditorCard({
  block,
  childrenBlocks,
  selectedId,
  onSelect,
  onDuplicate,
  onDelete,
  onAddChild,
}: {
  block: DraftBlock;
  childrenBlocks: DraftBlock[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDuplicate: (block: DraftBlock) => void;
  onDelete: (block: DraftBlock) => void;
  onAddChild: (type: BlockType) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.localId });
  const childTypes = blockTypes.filter((item) => item.type !== "subtask");

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`rounded-lg border p-3 ${selectedId === block.localId ? "border-primary bg-primary/10" : "border-border bg-surface-2"}`}>
      <button className="flex w-full items-center gap-3 text-left" onClick={() => onSelect(block.localId)}>
        <span {...attributes} {...listeners} className="cursor-grab rounded border border-border p-1">
          <GripVertical className="h-4 w-4" />
        </span>
        <BlockIcon type="subtask" className="h-4 w-4 text-primary" />
        <span className="min-w-0 flex-1 truncate font-display text-sm">▼ Sous-tâche : {block.title || "Sans titre"}</span>
        <Badge tone={block.is_blocking ? "yellow" : "muted"}>{block.is_blocking ? "Bloquante" : "Libre"}</Badge>
      </button>
      {block.content ? <p className="mt-2 pl-10 text-xs text-muted">{block.content}</p> : null}
      <div className="mt-3 flex gap-2 pl-10">
        <button className="rounded border border-border p-1 text-muted hover:text-white" onClick={() => onDuplicate(block)}>
          <Copy className="h-4 w-4" />
        </button>
        <button className="rounded border border-border p-1 text-muted hover:text-accent-red" onClick={() => onDelete(block)}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 space-y-3 border-l border-border pl-5">
        <div className="flex flex-wrap gap-2">
          {childTypes.map((item) => (
            <button key={item.type} className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[11px] hover:border-primary" onClick={() => onAddChild(item.type)}>
              <Plus className="h-3 w-3" />
              {item.label}
            </button>
          ))}
        </div>
        <SortableContext items={childrenBlocks.map((child) => child.localId)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {childrenBlocks.length === 0 ? <p className="text-xs text-muted">Ajoute des blocs dans cette sous-tâche.</p> : null}
            {childrenBlocks.map((child) => (
              <SortableBlockCard
                key={child.localId}
                block={child}
                selected={child.localId === selectedId}
                onSelect={() => onSelect(child.localId)}
                onDuplicate={() => onDuplicate(child)}
                onDelete={() => onDelete(child)}
              />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

function BlockForm({ block, onChange }: { block: DraftBlock; onChange: (patch: Partial<DraftBlock>) => void }) {
  const options = toArray<Option>(block.options, [
    { label: "Option 1", isCorrect: true },
    { label: "Option 2", isCorrect: false },
  ]);
  const checklistItems = toArray<ChecklistItem>(block.checklist_items, [{ id: "item-1", label: "Item a cocher" }]);
  const richItems = toArray<RichContentItem>(block.options, defaultRichItems());

  function updateRichItem(id: string, patch: Partial<RichContentItem>) {
    onChange({ options: richItems.map((item) => (item.id === id ? { ...item, ...patch } : item)) as Json });
  }

  function addRichItem(type: RichContentKind) {
    onChange({ options: [...richItems, newRichItem(type)] as Json });
  }

  function deleteRichItem(id: string) {
    onChange({ options: richItems.filter((item) => item.id !== id) as Json });
  }

  function moveRichItem(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= richItems.length) return;
    const next = [...richItems];
    const current = next[index];
    next[index] = next[nextIndex];
    next[nextIndex] = current;
    onChange({ options: next as Json });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BlockIcon type={block.type} className="h-6 w-6 text-primary" />
        <h2 className="font-display text-2xl font-bold">{blockLabel(block.type)}</h2>
      </div>
      <Field label="Titre optionnel" value={block.title ?? ""} onChange={(title) => onChange({ title })} />
      {isBlockingCapable(block.type) ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {block.type !== "subtask" ? <NumberField label="Points" value={block.points ?? 0} onChange={(points) => onChange({ points })} /> : <div />}
          <label className="flex items-center gap-2 pt-7 text-sm">
            <input type="checkbox" checked={Boolean(block.is_blocking)} onChange={(event) => onChange({ is_blocking: event.target.checked })} />
            Bloquant
          </label>
        </div>
      ) : null}

      {block.type === "subtask" ? <Area label="Description courte" value={block.content ?? ""} onChange={(content) => onChange({ content })} /> : null}
      {block.type === "rich_content" ? (
        <div className="space-y-4">
          <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-muted">
            Utilise ce bloc pour construire un vrai cours : texte, commandes terminal, prompts Windsurf, asides, citations et sections. Ce bloc est informatif et non bloquant.
          </div>
          <div className="flex flex-wrap gap-2">
            {richContentTypes.map((item) => (
              <button key={item.type} className="rounded-md border border-border bg-surface-2 px-3 py-2 text-xs hover:border-primary" onClick={() => addRichItem(item.type)}>
                + {item.label}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {richItems.map((item, index) => (
              <div key={item.id} className="space-y-3 rounded-lg border border-border bg-surface-2 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tone="indigo">{richContentLabel(item.type)}</Badge>
                  <div className="flex gap-2">
                    <button className="rounded border border-border p-1 text-muted hover:text-white" disabled={index === 0} onClick={() => moveRichItem(index, -1)}>
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button className="rounded border border-border p-1 text-muted hover:text-white" disabled={index === richItems.length - 1} onClick={() => moveRichItem(index, 1)}>
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button className="rounded border border-border p-1 text-muted hover:text-accent-red" onClick={() => deleteRichItem(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {item.type !== "divider" ? <Field label={item.type === "section" ? "Titre de section" : "Titre optionnel"} value={item.title ?? ""} onChange={(title) => updateRichItem(item.id, { title })} /> : null}
                {item.type !== "divider" ? (
                  richContentUsesMarkdown(item.type) ? (
                    <SelectableMarkdownArea label={richContentInputLabel(item.type)} value={item.content ?? ""} onChange={(content) => updateRichItem(item.id, { content })} />
                  ) : (
                    <Area
                      monospace={item.type === "terminal" || item.type === "prompt"}
                      label={richContentInputLabel(item.type)}
                      value={item.content ?? ""}
                      onChange={(content) => updateRichItem(item.id, { content })}
                    />
                  )
                ) : (
                  <p className="text-sm text-muted">Separateur visuel sans contenu.</p>
                )}
              </div>
            ))}
          </div>
          <div className="rounded-md border border-border bg-surface-2 p-4">
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted">Preview</p>
            <RichContentPreview items={richItems} />
          </div>
        </div>
      ) : null}
      {block.type === "theory" ? <MarkdownEditor value={block.content ?? ""} onChange={(content) => onChange({ content })} /> : null}
      {block.type === "qcm" ? (
        <div className="space-y-3">
          <Area label="Question" value={block.content ?? ""} onChange={(content) => onChange({ content })} />
          {options.map((option, index) => (
            <div key={index} className="grid gap-2 rounded-md border border-border bg-surface-2 p-3 sm:grid-cols-[1fr_auto]">
              <input
                className="h-10 rounded-md border border-border bg-surface px-3"
                value={option.label}
                onChange={(event) => {
                  const next = [...options];
                  next[index] = { ...option, label: event.target.value };
                  onChange({ options: next as Json });
                }}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={option.isCorrect}
                  onChange={(event) => {
                    const next = [...options];
                    next[index] = { ...option, isCorrect: event.target.checked };
                    onChange({ options: next as Json });
                  }}
                />
                Bonne reponse
              </label>
            </div>
          ))}
          <button className="rounded-md border border-border px-3 py-2 text-sm" disabled={options.length >= 5} onClick={() => onChange({ options: [...options, { label: `Option ${options.length + 1}`, isCorrect: false }] as Json })}>
            Ajouter une option
          </button>
          <Area label="Feedback mauvaise reponse" value={block.feedback_wrong ?? ""} onChange={(feedback_wrong) => onChange({ feedback_wrong })} />
        </div>
      ) : null}
      {block.type === "text_answer" ? (
        <div className="space-y-3">
          <Area label="Question" value={block.content ?? ""} onChange={(content) => onChange({ content })} />
          <Field label="Reponse correcte attendue" value={block.correct_answer ?? ""} onChange={(correct_answer) => onChange({ correct_answer })} />
          <Area label="Feedback mauvaise reponse" value={block.feedback_wrong ?? ""} onChange={(feedback_wrong) => onChange({ feedback_wrong })} />
        </div>
      ) : null}
      {block.type === "url" || block.type === "screenshot" ? (
        <div className="space-y-3">
          <Area label="Instruction" value={block.content ?? ""} onChange={(content) => onChange({ content })} />
          {block.type === "url" ? <Field label="URL correcte attendue optionnelle" value={block.correct_answer ?? ""} onChange={(correct_answer) => onChange({ correct_answer })} /> : null}
          {block.type === "screenshot" ? <Field label="Criteres de verification" value={block.feedback_wrong ?? ""} onChange={(feedback_wrong) => onChange({ feedback_wrong })} /> : null}
        </div>
      ) : null}
      {block.type === "prompt" ? <Area monospace label="Prompt Windsurf" value={block.prompt_code ?? ""} onChange={(prompt_code) => onChange({ prompt_code })} /> : null}
      {block.type === "video" ? (
        <div className="space-y-3">
          <Field label="URL YouTube ou Loom" value={block.video_url ?? ""} onChange={(video_url) => onChange({ video_url })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={Boolean(block.video_must_complete)} onChange={(event) => onChange({ video_must_complete: event.target.checked })} />
            L eleve doit regarder jusqu au bout
          </label>
        </div>
      ) : null}
      {block.type === "checklist" ? (
        <div className="space-y-3">
          {checklistItems.map((item, index) => (
            <input
              key={item.id}
              className="h-10 w-full rounded-md border border-border bg-surface px-3"
              value={item.label}
              onChange={(event) => {
                const next = [...checklistItems];
                next[index] = { ...item, label: event.target.value };
                onChange({ checklist_items: next as Json });
              }}
            />
          ))}
          <button className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => onChange({ checklist_items: [...checklistItems, { id: crypto.randomUUID(), label: "Nouvel item" }] as Json })}>
            Ajouter un item
          </button>
        </div>
      ) : null}
      {block.type === "code_execute" ? (
        <div className="space-y-3">
          <Field label="Commande terminal" value={block.code_command ?? ""} onChange={(code_command) => onChange({ code_command })} />
          <Field label="Resultat attendu optionnel" value={block.code_expected_output ?? ""} onChange={(code_expected_output) => onChange({ code_expected_output })} />
        </div>
      ) : null}
    </div>
  );
}

function MarkdownEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <SelectableMarkdownArea label="Markdown" value={value} onChange={onChange} />
      <div className="rounded-md border border-border bg-surface-2 p-4">
        <MarkdownPreview value={value} />
      </div>
    </div>
  );
}

function SelectableMarkdownArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const tools = [
    { label: "Gras", action: () => wrapSelection("**", "**", "texte") },
    { label: "Italique", action: () => wrapSelection("*", "*", "texte") },
    { label: "Code", action: () => wrapSelection("`", "`", "code") },
    { label: "Liste", action: () => insertLine("- item") },
    { label: "H2", action: () => insertLine("## Titre") },
    { label: "H3", action: () => insertLine("### Titre") },
    { label: "Citation", action: () => insertLine("> citation") },
    { label: "Separateur", action: () => insertLine("---") },
  ];

  function replaceSelection(nextText: string, cursorStart: number, cursorEnd = cursorStart) {
    const element = textareaRef.current;
    if (!element) return;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const next = `${value.slice(0, start)}${nextText}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(cursorStart, cursorEnd);
    });
  }

  function wrapSelection(prefix: string, suffix: string, fallback: string) {
    const element = textareaRef.current;
    if (!element) return;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const selected = value.slice(start, end) || fallback;
    const nextText = `${prefix}${selected}${suffix}`;
    replaceSelection(nextText, start + prefix.length, start + prefix.length + selected.length);
  }

  function insertLine(snippet: string) {
    const element = textareaRef.current;
    if (!element) return;
    const start = element.selectionStart;
    const prefix = value && !value.endsWith("\n") ? "\n" : "";
    replaceSelection(`${prefix}${snippet}`, start + prefix.length + snippet.length);
  }

  function applyColor(color: string) {
    const element = textareaRef.current;
    if (!element) return;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const selected = value.slice(start, end) || "texte";
    const prefix = `{color:${color}}`;
    const suffix = "{/color}";
    replaceSelection(`${prefix}${selected}${suffix}`, start + prefix.length, start + prefix.length + selected.length);
  }

  return (
    <label className="space-y-2">
      <span className="text-sm text-muted">{label}</span>
      <div className="space-y-3 rounded-md border border-border bg-surface-2 p-3">
        <div className="flex flex-wrap gap-2">
          {tools.map((tool) => (
            <button key={tool.label} type="button" className="rounded border border-border bg-surface px-2 py-1 text-xs hover:border-primary" onClick={tool.action}>
              {tool.label}
            </button>
          ))}
          <div className="flex flex-wrap items-center gap-1 border-l border-border pl-2">
            {markdownColors.map((color) => (
              <button
                key={color.name}
                type="button"
                className="h-6 w-6 rounded-full border border-border"
                style={{ backgroundColor: color.value }}
                title={color.label}
                aria-label={`Couleur ${color.label}`}
                onClick={() => applyColor(color.name)}
              />
            ))}
          </div>
        </div>
        <textarea ref={textareaRef} className="min-h-40 w-full rounded-md border border-border bg-surface p-3 font-mono" value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </label>
  );
}

const markdownColors = [
  { name: "indigo", label: "Indigo", value: "#6366f1" },
  { name: "green", label: "Vert", value: "#22c55e" },
  { name: "yellow", label: "Jaune", value: "#eab308" },
  { name: "red", label: "Rouge", value: "#ef4444" },
  { name: "blue", label: "Bleu", value: "#3b82f6" },
  { name: "cyan", label: "Cyan", value: "#06b6d4" },
  { name: "pink", label: "Rose", value: "#ec4899" },
  { name: "orange", label: "Orange", value: "#f97316" },
  { name: "slate", label: "Gris", value: "#64748b" },
  { name: "white", label: "Blanc", value: "#f8fafc" },
];

const richContentTypes: Array<{ type: RichContentKind; label: string }> = [
  { type: "markdown", label: "Texte" },
  { type: "terminal", label: "Commande terminal" },
  { type: "prompt", label: "Prompt Windsurf" },
  { type: "aside", label: "Aside" },
  { type: "section", label: "Section" },
  { type: "quote", label: "Citation" },
  { type: "divider", label: "Separateur" },
];

function RichContentPreview({ items }: { items: RichContentItem[] }) {
  return (
    <div className="space-y-5">
      {items.map((item) => {
        if (item.type === "divider") return <hr key={item.id} className="border-border" />;
        if (item.type === "section") {
          return (
            <section key={item.id} className="border-b border-border pb-3">
              <h3 className="font-display text-2xl font-bold">{item.title || item.content || "Section"}</h3>
            </section>
          );
        }
        if (item.type === "terminal" || item.type === "prompt") {
          return (
            <div key={item.id} className="space-y-2">
              {item.title ? <p className="font-semibold">{item.title}</p> : null}
              <pre className="overflow-x-auto rounded-md border border-border bg-background p-4 font-mono text-sm text-foreground">{item.content}</pre>
            </div>
          );
        }
        if (item.type === "aside") {
          return (
            <aside key={item.id} className="rounded-lg border border-primary/30 bg-primary/10 p-4">
              {item.title ? <p className="mb-2 font-display font-bold">{item.title}</p> : null}
              <MarkdownPreview value={item.content ?? ""} />
            </aside>
          );
        }
        if (item.type === "quote") {
          return (
            <blockquote key={item.id} className="border-l-4 border-primary pl-4 text-muted">
              {item.title ? <p className="mb-2 font-semibold text-foreground">{item.title}</p> : null}
              <MarkdownPreview value={item.content ?? ""} />
            </blockquote>
          );
        }
        return (
          <section key={item.id} className="space-y-2">
            {item.title ? <h4 className="font-display text-xl font-bold">{item.title}</h4> : null}
            <MarkdownPreview value={item.content ?? ""} />
          </section>
        );
      })}
    </div>
  );
}

function richContentLabel(type: RichContentKind) {
  return richContentTypes.find((item) => item.type === type)?.label ?? type;
}

function richContentInputLabel(type: RichContentKind) {
  if (type === "terminal") return "Commande(s) terminal";
  if (type === "prompt") return "Prompt Windsurf";
  if (type === "section") return "Description optionnelle";
  return "Contenu";
}

function richContentUsesMarkdown(type: RichContentKind) {
  return type === "markdown" || type === "aside" || type === "quote" || type === "section";
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2">
      <span className="text-sm text-muted">{label}</span>
      <input className="h-11 w-full rounded-md border border-border bg-surface px-3" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="space-y-2">
      <span className="text-sm text-muted">{label}</span>
      <input type="number" className="h-11 w-full rounded-md border border-border bg-surface px-3" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function Area({ label, value, onChange, monospace = false }: { label: string; value: string; onChange: (value: string) => void; monospace?: boolean }) {
  return (
    <label className="space-y-2">
      <span className="text-sm text-muted">{label}</span>
      <textarea className={`min-h-32 w-full rounded-md border border-border bg-surface p-3 ${monospace ? "font-mono" : ""}`} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function toEditableBlock(block: Block): EditableBlock {
  return {
    id: block.id,
    parent_block_id: block.parent_block_id,
    type: block.type,
    title: block.title,
    content: block.content,
    prompt_code: block.prompt_code,
    options: block.options,
    correct_answer: block.correct_answer,
    feedback_wrong: block.feedback_wrong,
    checklist_items: block.checklist_items,
    video_url: block.video_url,
    video_must_complete: block.video_must_complete,
    code_command: block.code_command,
    code_expected_output: block.code_expected_output,
    points: block.points,
    is_blocking: block.is_blocking,
    order_index: block.order_index,
  };
}

function newBlock(type: BlockType, title: string, orderIndex: number, parentBlockId: string | null = null): DraftBlock {
  const id = crypto.randomUUID();
  return {
    id,
    localId: id,
    parent_block_id: parentBlockId,
    type,
    title,
    content: "",
    prompt_code: "",
    options: type === "qcm" ? ([{ label: "Option 1", isCorrect: true }, { label: "Option 2", isCorrect: false }] as Json) : type === "rich_content" ? (defaultRichItems() as Json) : null,
    correct_answer: "",
    feedback_wrong: "",
    checklist_items: type === "checklist" ? ([{ id: crypto.randomUUID(), label: "Item a cocher" }] as Json) : null,
    video_url: "",
    video_must_complete: false,
    code_command: "",
    code_expected_output: "",
    points: type === "subtask" ? 0 : isBlockingCapable(type) ? 10 : 0,
    is_blocking: isBlockingCapable(type),
    order_index: orderIndex,
  };
}

function defaultRichItems(): RichContentItem[] {
  return [
    {
      id: crypto.randomUUID(),
      type: "markdown",
      title: "Introduction",
      content: "Explique ici le contexte du cours.",
    },
    {
      id: crypto.randomUUID(),
      type: "terminal",
      title: "Commande",
      content: "npm run dev",
    },
  ];
}

function newRichItem(type: RichContentKind): RichContentItem {
  const defaults: Record<RichContentKind, Omit<RichContentItem, "id" | "type">> = {
    markdown: { title: "Texte", content: "" },
    terminal: { title: "Commande terminal", content: "" },
    prompt: { title: "Prompt Windsurf", content: "" },
    aside: { title: "Aparté formateur", content: "" },
    section: { title: "Nouvelle section", content: "" },
    quote: { title: "Citation", content: "" },
    divider: {},
  };
  return {
    id: crypto.randomUUID(),
    type,
    ...defaults[type],
  };
}

function toArray<T>(value: Json | null, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function sortSiblings(blocks: DraftBlock[]) {
  return [...blocks].sort((a, b) => a.order_index - b.order_index);
}

function normalizeOrder(blocks: DraftBlock[]) {
  const parentIds = new Set(blocks.map((block) => block.parent_block_id ?? null));
  let ordered: DraftBlock[] = [];
  parentIds.forEach((parentId) => {
    ordered = [
      ...ordered,
      ...sortSiblings(blocks.filter((block) => (block.parent_block_id ?? null) === parentId)).map((block, index) => ({
        ...block,
        order_index: index + 1,
      })),
    ];
  });
  return ordered;
}
