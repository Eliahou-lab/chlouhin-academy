import type { Metadata } from "next";

import { ThemeToggle } from "@/components/theme-toggle";

import "./globals.css";

export const metadata: Metadata = {
  title: "ChlouhIN Academy",
  description: "LMS gamifie connecte a Supabase academy.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body>
        <div className="fixed right-4 top-4 z-[60]">
          <ThemeToggle />
        </div>
        {children}
      </body>
    </html>
  );
}
