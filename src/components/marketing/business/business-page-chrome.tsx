import Link from "next/link";
import type { ReactNode } from "react";

export function BusinessDisclosure({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={`rf-biz-disclosure ${className}`.trim()}>{children}</p>;
}

export function BusinessSection({
  id,
  title,
  lead,
  children,
  compact = false,
}: {
  id?: string;
  title: string;
  lead?: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <section
      id={id}
      className={`rf-biz-section${compact ? " rf-biz-section--compact" : ""}`}
      aria-labelledby={id ? `${id}-heading` : undefined}
    >
      <h2 id={id ? `${id}-heading` : undefined} className="rf-biz-section-title">
        {title}
      </h2>
      {lead ? <p className="rf-biz-section-lead">{lead}</p> : null}
      {children}
    </section>
  );
}

export function FlowDiagram({ lines }: { lines: string[] }) {
  return (
    <div className="rf-biz-flow" role="img" aria-label={lines.join(" then ")}>
      {lines.map((line, index) => (
        <div key={line} className="rf-biz-flow-row">
          <span className="rf-biz-flow-node">{line}</span>
          {index < lines.length - 1 ? <span className="rf-biz-flow-arrow" aria-hidden>↓</span> : null}
        </div>
      ))}
    </div>
  );
}

export function SplitDiagram({
  top,
  middle,
  branches,
  bottom,
}: {
  top: string;
  middle: string;
  branches: string[];
  bottom: string;
}) {
  return (
    <div className="rf-biz-split-diagram">
      <div className="rf-biz-split-row">
        <span className="rf-biz-flow-node rf-biz-flow-node--wide">{top}</span>
      </div>
      <span className="rf-biz-flow-arrow" aria-hidden>↓</span>
      <div className="rf-biz-split-row">
        <span className="rf-biz-flow-node">{middle}</span>
      </div>
      <span className="rf-biz-flow-arrow" aria-hidden>↓</span>
      <div className="rf-biz-split-branches">
        {branches.map((branch) => (
          <span key={branch} className="rf-biz-flow-node rf-biz-flow-node--branch">{branch}</span>
        ))}
      </div>
      <span className="rf-biz-flow-arrow" aria-hidden>↓</span>
      <div className="rf-biz-split-row">
        <span className="rf-biz-flow-node rf-biz-flow-node--wide">{bottom}</span>
      </div>
    </div>
  );
}

export function InlineLinkCta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="rf-biz-inline-link">
      {children}
    </Link>
  );
}
