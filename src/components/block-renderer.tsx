"use client";

import { AlertCircle, Check, CheckCircle2, Clock3, Copy, ExternalLink, Lock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useReward } from "react-rewards";

import { submitBlockProgressAction } from "@/app/actions/progress";
import { MarkdownPreview } from "@/components/markdown-preview";
import { Badge, Card } from "@/components/ui";
import { BlockIcon, blockLabel } from "@/lib/blocks";
import type { VisualBlockState } from "@/lib/block-status";
import { celebrateMissionComplete, celebrateQcmFirstTry, celebrateScreenshotValidated } from "@/lib/gamification";
import { playSound } from "@/lib/sounds";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Block, BlockProgress, Json } from "@/types/database";

type Option = { label: string; isCorrect?: boolean };
type ChecklistItem = { id: string; label: string };
type RichContentItem = {
  id: string;
  type: "markdown" | "terminal" | "prompt" | "aside" | "section" | "quote" | "divider";
  title?: string;
  content?: string;
};

export function BlockRenderer({
  block,
  teamId,
  progress,
  locked = false,
  visualState = "active",
  isLastGate = false,
  preview = false,
  revealContent = true,
}: {
  block: Block;
  teamId?: string;
  progress?: BlockProgress;
  locked?: boolean;
  visualState?: VisualBlockState;
  isLastGate?: boolean;
  preview?: boolean;
  revealContent?: boolean;
}) {
  const [answer, setAnswer] = useState(progress?.answer ?? "");
  const [selected, setSelected] = useState<string[]>([]);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [screenshotUrls, setScreenshotUrls] = useState<string[]>(progress?.screenshot_urls ?? []);
  const [teamComment, setTeamComment] = useState(progress?.team_comment ?? "");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const rewardId = `reward-${block.id}`;
  const { reward } = useReward(rewardId, "emoji", {
    emoji: ["🎉", "🚀", "⭐"],
    elementCount: 22,
    spread: 80,
    startVelocity: 24,
    elementSize: 28,
    zIndex: 80,
  });
  const options = useMemo(() => parseArray<Option>(block.options), [block.options]);
  const richItems = useMemo(() => parseArray<RichContentItem>(block.options), [block.options]);
  const checklistItems = useMemo(() => parseArray<ChecklistItem>(block.checklist_items), [block.checklist_items]);
  const videoEmbedUrl = useMemo(() => getVideoEmbedUrl(block.video_url), [block.video_url]);
  const directVideoUrl = useMemo(() => getDirectVideoUrl(block.video_url), [block.video_url]);
  const cardState = {
    locked: "opacity-40 cursor-not-allowed border-border",
    completed: "border-accent-green bg-accent-green/5",
    submitted: "border-accent-yellow bg-accent-yellow/5",
    rejected: "border-accent-red bg-accent-red/5",
    active: "border-primary bg-surface",
  }[visualState];

  useEffect(() => {
    if (progress?.status !== "validated") return;
    const key = `validated:${progress.id}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
    playSound("validated");
    reward();
    if (block.type === "screenshot") celebrateScreenshotValidated();
    if (isLastGate) {
      celebrateMissionComplete();
      playSound("mission_complete");
    }
  }, [block.type, isLastGate, progress?.id, progress?.status, reward]);

  async function submit(nextAnswer = answer) {
    if (locked) return;
    if (preview) {
      setMessage("Preview locale: aucune donnee sauvegardee.");
      return;
    }
    if (!teamId) return;
    const response = await submitBlockProgressAction({
      teamId,
      blockId: block.id,
      answer: block.type === "qcm" ? selected.join(",") : nextAnswer,
      checklistState: checklist,
      screenshotUrls: block.type === "screenshot" ? screenshotUrls : [],
      teamComment,
    });
    if (!response.ok) {
      setMessage(response.error ?? response.message ?? "Action refusee.");
      return;
    }
    if (response.correct) {
      playSound("correct");
      reward();
      if (block.type === "qcm" && "attempts" in response && response.attempts === 1) celebrateQcmFirstTry();
      if (isLastGate) {
        celebrateMissionComplete();
        playSound("mission_complete");
      }
    } else if (response.correct === false) {
      playSound("wrong");
    }
    setMessage(response.correct === false ? block.feedback_wrong ?? "Reponse incorrecte." : response.correct === null ? "En attente de validation du formateur." : "Bloc enregistre.");
  }

  async function uploadScreenshots(files: FileList | File[]) {
    if (!teamId) {
      setMessage("Equipe introuvable.");
      return;
    }
    const selectedFiles = Array.from(files);
    const validFiles = selectedFiles.filter((file) => ["image/png", "image/jpeg", "image/webp"].includes(file.type) && file.size <= 5 * 1024 * 1024);
    if (validFiles.length !== selectedFiles.length) {
      setMessage("Images PNG, JPEG ou WebP uniquement, 5Mo max.");
    }
    if (validFiles.length === 0) return;

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setMessage("Configuration Supabase manquante.");
      return;
    }

    setUploading(true);
    try {
      const urls = await Promise.all(
        validFiles.map(async (file) => {
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
          const fileName = `${teamId}/${block.id}/${Date.now()}_${safeName}`;
          const { error } = await supabase.storage.from("screenshots").upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });
          if (error) throw error;
          const { data } = supabase.storage.from("screenshots").getPublicUrl(fileName);
          return data.publicUrl;
        }),
      );
      setScreenshotUrls((current) => [...current, ...urls]);
      setMessage("Screenshot uploadé.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload impossible.");
    } finally {
      setUploading(false);
    }
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    if (block.type === "prompt" && !preview && teamId) {
      await submit("copied");
    }
    setTimeout(() => setCopied(false), 1200);
  }

  if (block.type === "separator") {
    return <h2 className="border-y border-border py-4 font-display text-3xl font-bold">{block.title}</h2>;
  }

  return (
    <Card className={`relative space-y-4 transition ${cardState}`}>
      <span id={rewardId} className="pointer-events-none absolute left-1/2 top-8" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-md border border-border bg-surface-2 p-2">
            <BlockIcon type={block.type} className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-xl font-bold">{block.title ?? blockLabel(block.type)}</h3>
            <p className="text-xs text-muted">{blockLabel(block.type)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StateBadge state={visualState} />
          <Badge tone={block.is_blocking ? "yellow" : "muted"}>{block.is_blocking ? `${block.points ?? 0} pts` : "Info"}</Badge>
        </div>
      </div>

      {locked ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2 p-3 text-sm text-muted">
          <Lock className="h-4 w-4" />
          Complete l etape precedente d abord.
        </div>
      ) : null}
      {!revealContent ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2 p-3 text-sm text-muted">
          <Lock className="h-4 w-4" />
          Le contenu de cette sous-tâche sera révélé après la précédente.
        </div>
      ) : null}
      {visualState === "submitted" ? (
        <div className="flex items-center gap-2 rounded-md border border-accent-yellow/40 bg-accent-yellow/10 p-3 text-sm text-accent-yellow">
          <Clock3 className="h-4 w-4" />
          En attente de validation du formateur.
        </div>
      ) : null}
      {visualState === "rejected" ? (
        <div className="flex items-center gap-2 rounded-md border border-accent-red/40 bg-accent-red/10 p-3 text-sm text-accent-red">
          <AlertCircle className="h-4 w-4" />
          {progress?.formateur_comment ?? "Refuse par le formateur. Tu peux resoumettre."}
        </div>
      ) : null}

      {revealContent && block.type === "theory" ? <MarkdownPreview value={block.content ?? ""} /> : null}

      {revealContent && block.type === "rich_content" ? <RichContentRenderer items={richItems} onCopy={copy} /> : null}

      {revealContent && block.type === "prompt" ? (
        <div className="space-y-3">
          <pre className="overflow-x-auto rounded-md border border-border bg-surface-2 p-4 font-mono text-sm text-foreground">{block.prompt_code}</pre>
          <button className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50" disabled={locked} onClick={() => copy(block.prompt_code ?? "")}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copie ✓" : "Copier"}
          </button>
        </div>
      ) : null}

      {revealContent && block.type === "qcm" ? (
        <div className="space-y-3">
          <p className="text-foreground">{block.content}</p>
          {options.map((option, index) => (
            <label key={`${option.label}-${index}`} className="flex items-center gap-3 rounded-md border border-border bg-surface-2 p-3">
              <input
                type="checkbox"
                disabled={locked}
                checked={selected.includes(String(index))}
                onChange={(event) => {
                  setSelected((current) => (event.target.checked ? [...current, String(index)] : current.filter((item) => item !== String(index))));
                }}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      ) : null}

      {revealContent && (block.type === "text_answer" || block.type === "url" || block.type === "code_execute") ? (
        <div className="space-y-3">
          <p className="text-foreground">{block.content}</p>
          {block.type === "code_execute" ? (
            <div className="flex items-center justify-between rounded-md border border-border bg-surface-2 p-3 font-mono text-sm">
              <code>{block.code_command}</code>
              <button onClick={() => copy(block.code_command ?? "")}>
                <Copy className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          <input
            className="h-11 w-full rounded-md border border-border bg-surface px-3 text-foreground outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Votre reponse"
            value={answer}
            disabled={locked}
            onChange={(event) => setAnswer(event.target.value)}
          />
        </div>
      ) : null}

      {revealContent && block.type === "screenshot" ? (
        <div className="space-y-3">
          <p className="text-foreground">{block.content}</p>
          <label
            className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-2 p-6 text-center transition hover:border-primary"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (!locked) void uploadScreenshots(event.dataTransfer.files);
            }}
          >
            <input
              className="sr-only"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              disabled={locked || uploading}
              onChange={(event) => {
                if (event.target.files) void uploadScreenshots(event.target.files);
                event.currentTarget.value = "";
              }}
            />
            <span className="font-display text-lg">{uploading ? "Upload en cours..." : "Dépose tes screenshots ici"}</span>
            <span className="mt-2 text-sm text-muted">PNG, JPEG, WebP · 5Mo max · plusieurs fichiers acceptés</span>
          </label>
          {screenshotUrls.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {screenshotUrls.map((url) => (
                <div key={url} className="overflow-hidden rounded-md border border-border bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Screenshot uploadé" className="aspect-video w-full object-cover" />
                  <button className="w-full border-t border-border px-3 py-2 text-sm text-muted hover:text-accent-red" onClick={() => setScreenshotUrls((current) => current.filter((item) => item !== url))}>
                    Supprimer
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <textarea
            className="min-h-20 w-full rounded-md border border-border bg-surface p-3 text-foreground outline-none focus:border-primary"
            placeholder="Commentaire pour le formateur"
            value={teamComment}
            disabled={locked}
            onChange={(event) => setTeamComment(event.target.value)}
          />
        </div>
      ) : null}

      {revealContent && block.type === "video" ? (
        <div className="space-y-3">
          {directVideoUrl ? (
            <video
              className="aspect-video w-full rounded-md border border-border bg-surface-2"
              controls
              src={directVideoUrl}
              onEnded={() => {
                if (block.video_must_complete) void submit("video-ended");
              }}
            />
          ) : videoEmbedUrl ? (
            <iframe
              className="aspect-video w-full rounded-md border border-border bg-surface-2"
              src={videoEmbedUrl}
              title={block.title ?? "Video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : block.video_url ? (
            <a className="inline-flex items-center gap-2 text-primary" href={block.video_url} target="_blank" rel="noreferrer">
              Ouvrir la video <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
          <p className="text-sm text-muted">{block.video_must_complete ? "A regarder jusqu au bout." : "Video informative."}</p>
          {block.video_must_complete ? (
            <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50" disabled={locked} onClick={() => submit("video-ended")}>
              J ai termine la video
            </button>
          ) : null}
        </div>
      ) : null}

      {revealContent && block.type === "checklist" ? (
        <div className="space-y-2">
          {checklistItems.map((item) => (
            <label key={item.id} className="flex items-center gap-3 rounded-md border border-border bg-surface-2 p-3">
              <input
                type="checkbox"
                disabled={locked}
                checked={Boolean(checklist[item.id])}
                onChange={(event) => setChecklist((current) => ({ ...current, [item.id]: event.target.checked }))}
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      ) : null}

      {revealContent && block.type === "theory" ? (
        <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50" disabled={locked} onClick={() => submit("read")}>
          J&apos;ai lu
        </button>
      ) : revealContent && (block.is_blocking || ["url", "screenshot", "checklist", "code_execute"].includes(block.type)) ? (
        <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50" disabled={locked || visualState === "submitted"} onClick={() => submit()}>
          {visualState === "rejected" ? "Resoumettre" : "Valider ce bloc"}
        </button>
      ) : null}
      {message ? <p className="text-sm text-muted">{message}</p> : null}
    </Card>
  );
}

function StateBadge({ state }: { state: VisualBlockState }) {
  if (state === "completed") {
    return (
      <Badge tone="green">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Complete
      </Badge>
    );
  }
  if (state === "submitted") return <Badge tone="yellow">En attente</Badge>;
  if (state === "rejected") return <Badge tone="red">Refuse</Badge>;
  if (state === "locked") return <Badge tone="muted">Verrouille</Badge>;
  return <Badge tone="indigo">En cours</Badge>;
}

function RichContentRenderer({ items, onCopy }: { items: RichContentItem[]; onCopy: (value: string) => Promise<void> }) {
  return (
    <div className="space-y-6">
      {items.map((item) => {
        if (item.type === "divider") return <hr key={item.id} className="border-border" />;
        if (item.type === "section") {
          return (
            <section key={item.id} className="border-y border-border py-4">
              <h2 className="font-display text-3xl font-bold">{item.title || item.content || "Section"}</h2>
              {item.title && item.content ? <p className="mt-2 text-muted">{item.content}</p> : null}
            </section>
          );
        }
        if (item.type === "terminal" || item.type === "prompt") {
          return (
            <div key={item.id} className="space-y-3">
              {item.title ? <p className="font-display text-lg font-bold">{item.title}</p> : null}
              <div className="overflow-hidden rounded-lg border border-border bg-surface-2">
                <div className="flex items-center justify-between border-b border-border px-4 py-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-muted">{item.type === "terminal" ? "Terminal" : "Windsurf Prompt"}</span>
                  <button className="inline-flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-white" onClick={() => onCopy(item.content ?? "")}>
                    <Copy className="h-3 w-3" />
                    Copier
                  </button>
                </div>
                <pre className="overflow-x-auto p-4 font-mono text-sm text-foreground">{item.content}</pre>
              </div>
            </div>
          );
        }
        if (item.type === "aside") {
          return (
            <aside key={item.id} className="rounded-xl border border-primary/30 bg-primary/10 p-4">
              {item.title ? <p className="mb-2 font-display text-lg font-bold">{item.title}</p> : null}
              <MarkdownPreview value={item.content ?? ""} />
            </aside>
          );
        }
        if (item.type === "quote") {
          return (
            <blockquote key={item.id} className="border-l-4 border-primary pl-4">
              {item.title ? <p className="mb-2 font-semibold text-foreground">{item.title}</p> : null}
              <div className="text-muted">
                <MarkdownPreview value={item.content ?? ""} />
              </div>
            </blockquote>
          );
        }
        return (
          <section key={item.id} className="space-y-2">
            {item.title ? <h3 className="font-display text-2xl font-bold">{item.title}</h3> : null}
            <MarkdownPreview value={item.content ?? ""} />
          </section>
        );
      })}
    </div>
  );
}

function parseArray<T>(value: Json | null): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function getVideoEmbedUrl(url: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }
    if (parsed.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${parsed.pathname.replace("/", "")}`;
    }
    if (parsed.hostname.includes("loom.com") && parsed.pathname.includes("/share/")) {
      return url.replace("/share/", "/embed/");
    }
    return null;
  } catch {
    return null;
  }
}

function getDirectVideoUrl(url: string | null) {
  if (!url) return null;
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url) ? url : null;
}
