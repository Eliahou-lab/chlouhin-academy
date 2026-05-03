"use client";

function inlineMarkdown(value: string) {
  return value
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
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
