"use client";

import confetti from "canvas-confetti";

export function celebrateQcmFirstTry() {
  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.7 },
    colors: ["#6366f1", "#22c55e", "#eab308"],
  });
}

export function celebrateScreenshotValidated() {
  confetti({
    particleCount: 150,
    spread: 100,
    origin: { y: 0.6 },
    colors: ["#6366f1", "#22c55e", "#f8fafc"],
  });
}

export function celebrateMissionComplete() {
  confetti({
    particleCount: 200,
    angle: 60,
    spread: 80,
    origin: { x: 0 },
  });
  confetti({
    particleCount: 200,
    angle: 120,
    spread: 80,
    origin: { x: 1 },
  });
}
