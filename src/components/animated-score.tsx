"use client";

import { useEffect, useRef, useState } from "react";

export function AnimatedScore({ value }: { value: number }) {
  const previous = useRef(value);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const start = previous.current;
    const delta = value - start;
    const started = performance.now();
    const duration = 1000;
    let frame = 0;

    const tick = (now: number) => {
      const ratio = Math.min(1, (now - started) / duration);
      setDisplay(Math.round(start + delta * ratio));
      if (ratio < 1) frame = requestAnimationFrame(tick);
      else previous.current = value;
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span className="font-display tabular-nums">{display}</span>;
}
