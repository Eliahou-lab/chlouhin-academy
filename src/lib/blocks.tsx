import {
  BookOpen,
  CheckSquare,
  Code2,
  Film,
  FileText,
  Heading2,
  Image,
  LinkIcon,
  ListChecks,
  MessageSquareText,
  PanelTop,
  Terminal,
} from "lucide-react";

import type { BlockType } from "@/types/database";

export const blockTypes: Array<{ type: BlockType; label: string; iconName: string; defaultTitle: string }> = [
  { type: "rich_content", label: "Cours riche", iconName: "FileText", defaultTitle: "Cours / narration" },
  { type: "theory", label: "Theorie", iconName: "BookOpen", defaultTitle: "Bloc theorie" },
  { type: "qcm", label: "QCM", iconName: "ListChecks", defaultTitle: "Question QCM" },
  { type: "text_answer", label: "Texte libre", iconName: "MessageSquareText", defaultTitle: "Reponse texte" },
  { type: "url", label: "URL", iconName: "LinkIcon", defaultTitle: "Reponse URL" },
  { type: "screenshot", label: "Screenshot", iconName: "Image", defaultTitle: "Screenshot" },
  { type: "prompt", label: "Prompt", iconName: "Terminal", defaultTitle: "Prompt Windsurf" },
  { type: "video", label: "Video", iconName: "Film", defaultTitle: "Video" },
  { type: "checklist", label: "Checklist", iconName: "CheckSquare", defaultTitle: "Checklist" },
  { type: "code_execute", label: "Code", iconName: "Code2", defaultTitle: "Commande terminal" },
  { type: "separator", label: "Separateur", iconName: "Heading2", defaultTitle: "Section" },
  { type: "subtask", label: "Sous-tâche", iconName: "PanelTop", defaultTitle: "Nouvelle sous-tâche" },
];

export function blockLabel(type: BlockType) {
  return blockTypes.find((item) => item.type === type)?.label ?? type;
}

export function BlockIcon({ type, className }: { type: BlockType; className?: string }) {
  const icons = {
    theory: BookOpen,
    rich_content: FileText,
    qcm: ListChecks,
    text_answer: MessageSquareText,
    url: LinkIcon,
    screenshot: Image,
    prompt: Terminal,
    video: Film,
    checklist: CheckSquare,
    code_execute: Code2,
    separator: Heading2,
    subtask: PanelTop,
  };
  const Icon = icons[type] ?? BookOpen;
  return <Icon className={className ?? "h-4 w-4"} />;
}

export function isBlockingCapable(type: BlockType) {
  return ["qcm", "text_answer", "url", "screenshot", "video", "checklist", "code_execute", "subtask"].includes(type);
}
