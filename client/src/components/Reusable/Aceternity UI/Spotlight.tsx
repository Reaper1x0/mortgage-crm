import { useMemo, useRef, useState } from "react";
import { cn } from "../../../utils/cn";

type Props = {
  className?: string;
  size?: number;
  intensity?: number; // 0..1
};

export default function Spotlight({ className, size = 380, intensity = 0.16 }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const bg = useMemo(() => {
    if (!pos) return "transparent";
    return `radial-gradient(${size}px circle at ${pos.x}px ${pos.y}px, rgba(255,255,255,${intensity}), transparent 55%)`;
  }, [pos, size, intensity]);

  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
      onMouseLeave={() => setPos(null)}
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{ background: bg }}
    />
  );
}
