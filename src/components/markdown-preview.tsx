"use client";

const allowedColors: Record<string, string> = {
  indigo: "#6366f1",
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
  blue: "#3b82f6",
  cyan: "#06b6d4",
  pink: "#ec4899",
  orange: "#f97316",
  slate: "#64748b",
  white: "#f8fafc",
};

function inlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/\{color:([a-z]+)\}([\s\S]*?)\{\/color\}/g, (_, color: string, text: string) => {
      const safeColor = allowedColors[color];
      return safeColor ? `<span style="color:${safeColor}">${text}</span>` : text;
    })
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function MarkdownPreview({ value }: { value: string }) {
  const html = value
    .split("\n")
    .map((line) => {
      if (line.startsWith("## ")) return `<h2>${inlineMarkdown(line.slice(3))}</h2>`;
      if (line.startsWith("### ")) return `<h3>${inlineMarkdown(line.slice(4))}</h3>`;
      if (line.startsWith("> ")) return `<blockquote>${inlineMarkdown(line.slice(2))}</blockquote>`;
      if (line.startsWith("- ")) return `<li>${inlineMarkdown(line.slice(2))}</li>`;
      if (line.trim() === "---") return "<hr />";
      if (!line.trim()) return "<br />";
      return `<p>${inlineMarkdown(line)}</p>`;
    })
    .join("");

  return (
    <div
      className="prose prose-invert max-w-none prose-headings:font-display prose-code:rounded prose-code:bg-surface-2 prose-code:px-1 prose-blockquote:border-primary prose-hr:border-border"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
