"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { useEffect, useRef } from "react";

export type GlassLevel = "functional" | "elevated" | "hero";

type GlassSurfaceProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  className?: string;
  as?: "div" | "aside" | "section";
  level?: GlassLevel;
  /** Audit string: nav, tooltip, dialog, trace, etc. */
  purpose?: string;
};

const levelClass: Record<GlassLevel, string> = {
  functional: "rf-glass-l2",
  elevated: "rf-glass-l3",
  hero: "rf-glass-l3 rf-glass-hero",
};

const levelAttr: Record<GlassLevel, "2" | "3"> = {
  functional: "2",
  elevated: "3",
  hero: "3",
};

export function GlassSurface({
  children,
  className = "",
  as: Tag = "div",
  level = "functional",
  purpose,
  ...rest
}: GlassSurfaceProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const node = ref.current;
    if (!node) return;
    const parentGlass = node.parentElement?.closest("[data-rf-glass-level]");
    if (parentGlass && level !== "functional") {
      console.warn(
        "[Peffle Glass] Avoid glass-on-glass: nested elevated glass inside another glass surface.",
        { purpose },
      );
    }
  }, [level, purpose]);

  return (
    <Tag
      ref={ref as never}
      className={`${levelClass[level]} ${className}`.trim()}
      data-rf-glass-level={levelAttr[level]}
      {...(purpose ? { "data-rf-glass-purpose": purpose } : {})}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** @deprecated Use GlassSurface with level="functional" */
export function LiquidGlass({
  children,
  className = "",
  as: Tag = "div",
  ...rest
}: Omit<GlassSurfaceProps, "level" | "purpose">) {
  return (
    <GlassSurface as={Tag} className={className} level="functional" purpose="legacy-liquid-glass" {...rest}>
      {children}
    </GlassSurface>
  );
}
