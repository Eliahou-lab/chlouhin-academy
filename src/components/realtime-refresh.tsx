"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function RealtimeRefresh({ tables }: { tables: string[] }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;

    const channels = tables.map((table) =>
      supabase
        .channel(`academy:${table}`)
        .on("postgres_changes", { event: "*", schema: "academy", table }, () => router.refresh())
        .subscribe(),
    );

    return () => {
      channels.forEach((channel) => {
        void supabase.removeChannel(channel);
      });
    };
  }, [router, tables]);

  return null;
}
