"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

export type GlassTab = {
  id: string;
  label: string;
  href: string;
};

type Props = {
  tabs: GlassTab[];
  defaultId?: string;
  className?: string;
};

export function GlassTabs({ tabs, defaultId, className = "" }: Props) {
  const initial = defaultId ?? tabs[0]?.id ?? "";
  const [active, setActive] = useState(initial);
  const railRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const reduceMotion = useReducedMotion();

  const measure = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const btn = rail.querySelector<HTMLButtonElement>(`[data-tab-id="${active}"]`);
    if (!btn) return;
    setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [active]);

  useLayoutEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  return (
    <div
      ref={railRef}
      className={`glass-tabs glass-floating ${className}`.trim()}
      role="tablist"
      aria-label="Sections"
    >
      <motion.span
        className="glass-tabs__indicator"
        layout
        initial={false}
        animate={{ left: indicator.left, width: indicator.width }}
        transition={
          reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }
        }
      />
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          data-tab-id={tab.id}
          aria-selected={active === tab.id}
          className="glass-tabs__tab"
          onClick={() => {
            setActive(tab.id);
            const el = document.querySelector(tab.href);
            el?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
