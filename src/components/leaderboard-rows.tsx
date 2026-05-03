"use client";

import { AnimatePresence, motion } from "framer-motion";

import { AnimatedScore } from "@/components/animated-score";
import { Card, ProgressBar } from "@/components/ui";
import { globalProgress } from "@/lib/progress";
import type { Block, BlockProgress, Mission, Team } from "@/types/database";

export function LeaderboardRows({
  teams,
  missions,
  blocks,
  progress,
}: {
  teams: Team[];
  missions: Mission[];
  blocks: Block[];
  progress: BlockProgress[];
}) {
  return (
    <div className="space-y-3">
      <AnimatePresence>
        {teams.map((team, index) => {
          const teamProgress = progress.filter((item) => item.team_id === team.id);
          const global = globalProgress(missions, blocks, teamProgress);
          return (
            <motion.div
              key={team.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
            >
              <Card className="grid grid-cols-[80px_1fr_160px] items-center gap-4">
                <p className="font-display text-4xl text-primary">#{index + 1}</p>
                <div>
                  <h2 className="font-display text-3xl">
                    {team.avatar_emoji ?? "🚀"} {team.name}
                  </h2>
                  <ProgressBar value={global.percent} />
                </div>
                <p className="text-right font-display text-4xl text-accent-green">
                  <AnimatedScore value={team.total_score ?? 0} />
                </p>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
