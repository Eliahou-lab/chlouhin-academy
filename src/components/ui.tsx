import Link from "next/link";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

export const Card = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function Card({ children, className, ...props }, ref) {
  return <div ref={ref} className={cn("rounded-lg border border-border bg-surface p-5", className)} {...props}>{children}</div>;
});

export function Badge({ children, tone = "indigo" }: { children: React.ReactNode; tone?: "indigo" | "green" | "yellow" | "red" | "muted" }) {
  const tones = {
    indigo: "border-primary/50 bg-primary/15 text-indigo-200",
    green: "border-accent-green/50 bg-accent-green/15 text-green-200",
    yellow: "border-accent-yellow/50 bg-accent-yellow/15 text-yellow-100",
    red: "border-accent-red/50 bg-accent-red/15 text-red-200",
    muted: "border-border bg-surface-2 text-muted",
  };
  return <span className={cn("inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold", tones[tone])}>{children}</span>;
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return <main className="mission-grid min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">{children}</main>;
}

export function EmptyState({ title, href }: { title: string; href?: string }) {
  return (
    <Card className="mx-auto max-w-2xl text-center">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <p className="mt-2 text-sm text-muted">Aucune donnee Supabase disponible dans le schema academy.</p>
      {href ? (
        <Link className="mt-5 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold" href={href}>
          Retour
        </Link>
      ) : null}
    </Card>
  );
}
