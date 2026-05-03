import { PageShell } from "@/components/ui";

export default function Loading() {
  return (
    <PageShell>
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="h-16 animate-pulse rounded-lg bg-surface-2" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-44 animate-pulse rounded-lg border border-border bg-surface" />
          ))}
        </div>
      </div>
    </PageShell>
  );
}
