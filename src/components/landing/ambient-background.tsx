"use client";

import { useEffect, useRef } from "react";

/** Fixed phases. Computed once. Never regenerated inside the frame loop. */
const BLOBS = [
  { x: 67, y: 46, rx: 92, ry: 78, p: 0.17, p2: 1.31, color: "rgba(226, 229, 232, 0.42)" },
  { x: 35, y: 66, rx: 100, ry: 86, p: 2.04, p2: 0.62, color: "rgba(238, 243, 244, 0.34)" },
  { x: 48, y: 20, rx: 108, ry: 90, p: 3.51, p2: 2.77, color: "rgba(240, 242, 243, 0.38)" },
  { x: 81, y: 88, rx: 84, ry: 74, p: 4.88, p2: 3.14, color: "rgba(234, 245, 248, 0.22)" },
] as const;

/** Continuous mesh. At elapsed 0 the sine offsets cancel, matching the static field. */
export function ambientMeshImage(elapsedSeconds: number): string {
  const ph = elapsedSeconds * 1.0;
  const amt = 1.0;
  const layers = BLOBS.map((blob) => {
    const x = blob.x + (Math.sin(ph * 0.55 + blob.p) - Math.sin(blob.p)) * 14 * amt;
    const y = blob.y + (Math.sin(ph * 0.43 + blob.p2) - Math.sin(blob.p2)) * 14 * amt;
    return `radial-gradient(ellipse ${blob.rx}% ${blob.ry}% at ${x}% ${y}%, ${blob.color} 0%, rgba(255, 255, 255, 0) 68%)`;
  });
  return layers.join(", ");
}

export function AmbientBackground() {
  const meshRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    mesh.style.backgroundImage = ambientMeshImage(0);
    if (reduced) {
      mesh.dataset.animated = "false";
      return;
    }

    mesh.dataset.animated = "true";
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const elapsedSeconds = (now - start) / 1000;
      mesh.style.backgroundImage = ambientMeshImage(elapsedSeconds);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="rf-ambient" data-testid="ambient-mesh" aria-hidden>
      <div
        ref={meshRef}
        className="rf-ambient__mesh"
        style={{ backgroundImage: ambientMeshImage(0) }}
      />
      <div className="rf-ambient__grain" />
    </div>
  );
}
