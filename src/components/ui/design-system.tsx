"use client";

import type { HTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { CircleNotch } from "@phosphor-icons/react";
import { useBodyScrollLock } from "@/lib/hooks/use-body-scroll-lock";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white shadow-[var(--rf-shadow-e1)] hover:bg-accent-hover enabled:active:scale-[0.98] enabled:active:bg-[var(--rf-accent-active)] disabled:opacity-50 disabled:shadow-none",
  secondary:
    "border border-[color-mix(in_oklab,var(--rf-control-border)_70%,var(--rf-line))] bg-[var(--rf-bg-primary)] text-ink hover:border-line-strong hover:text-ink hover:bg-canvas-2/60 disabled:opacity-50",
  ghost: "text-ink-soft hover:bg-canvas-2 hover:text-ink disabled:opacity-50",
  danger:
    "bg-[color-mix(in_oklab,var(--rf-danger)_12%,transparent)] text-danger hover:bg-[color-mix(in_oklab,var(--rf-danger)_18%,transparent)] disabled:opacity-50",
};

const buttonLayout =
  "rf-btn rf-motion-colors inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] px-4 text-sm font-medium";

export function Button({
  variant = "primary",
  className = "",
  loading = false,
  type = "button",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
}) {
  return (
    <button
      type={type}
      className={`${buttonLayout} ${buttonClasses[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <CircleNotch className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  className = "",
  children,
  ...props
}: React.ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
}) {
  return (
    <Link href={href} className={`${buttonLayout} ${buttonClasses[variant]} ${className}`} {...props}>
      {children}
    </Link>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
        {description ? <p className="mt-1.5 max-w-[62ch] text-sm leading-relaxed text-ink-soft">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-semibold tracking-tight text-ink">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
    </div>
  );
}

export function Surface({
  children,
  className = "",
  padding = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  padding?: "none" | "default" | "compact";
}) {
  const paddingClass =
    padding === "none" ? "" : padding === "compact" ? "p-4 md:p-5" : "p-5 md:p-6";
  return (
    <div className={`rf-surface rounded-[12px] ${paddingClass} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`rf-input min-h-11 w-full rounded-[8px] border border-line/80 bg-surface px-3 text-sm text-ink ${className}`}
      {...props}
    />
  );
}

export function Textarea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`rf-input w-full resize-y rounded-[8px] border border-line/80 bg-surface px-3 py-2.5 text-[15px] leading-relaxed text-ink ${className}`}
      {...props}
    />
  );
}

export function Select({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`rf-input min-h-11 w-full rounded-[8px] border border-line/80 bg-surface px-3 text-sm text-ink ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "blocked" | "info" | "accent";

const badgeToneClasses: Record<BadgeTone, string> = {
  neutral: "bg-canvas-2 text-muted",
  success: "bg-[color-mix(in_oklab,var(--rf-success)_12%,transparent)] text-success",
  warning: "bg-[color-mix(in_oklab,var(--rf-warning)_12%,transparent)] text-warning",
  danger: "bg-[color-mix(in_oklab,var(--rf-danger)_12%,transparent)] text-danger",
  blocked: "bg-[color-mix(in_oklab,var(--rf-blocked)_12%,transparent)] text-blocked",
  info: "bg-[color-mix(in_oklab,var(--rf-info)_12%,transparent)] text-[var(--rf-info)]",
  accent: "bg-accent-soft text-accent",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-[var(--rf-radius-pill)] px-2.5 py-0.5 text-[var(--rf-type-meta)] font-medium ${badgeToneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rf-empty-inline">
      <p className="rf-empty-inline-title">{title}</p>
      <p className="rf-empty-inline-desc">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-6">
      <CircleNotch className="size-5 animate-spin text-accent" aria-hidden />
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[8px] bg-line/50 ${className}`} aria-hidden />;
}

export function DataTable({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rf-data-table overflow-x-auto ${className}`}>
      <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-line/70 bg-canvas-2/50 text-xs uppercase tracking-wide text-muted">
      {children}
    </thead>
  );
}

export function TableRow({
  children,
  onClick,
  selected = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  selected?: boolean;
}) {
  const interactive = Boolean(onClick);
  return (
    <tr
      onClick={onClick}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={`border-b border-line/50 last:border-b-0 rf-motion-colors ${
        interactive ? "cursor-pointer hover:bg-canvas-2/40 focus-visible:bg-canvas-2/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40" : ""
      } ${selected ? "bg-accent-soft/30" : ""}`}
      data-selected={selected ? "true" : undefined}
    >
      {children}
    </tr>
  );
}

export function TableCell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-2.5 align-middle ${className}`}>{children}</td>;
}

export function TableHeaderCell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <th className={`px-4 py-2.5 font-medium ${className}`}>{children}</th>;
}

export function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-muted">{label}</span>
      <Select value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </label>
  );
}

export function PrimaryMetric({
  label,
  value,
  hint,
  money = false,
}: {
  label: string;
  value: number | string;
  hint?: string;
  money?: boolean;
}) {
  return (
    <div className="rf-primary-metric rounded-[12px] p-5 md:p-6">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 text-4xl font-semibold tracking-tight tabular">
        {typeof value === "string" ? value : money ? `₹${value.toLocaleString("en-IN")}` : value}
      </p>
      {hint ? <p className="mt-2 text-xs text-ink-soft">{hint}</p> : null}
    </div>
  );
}

export function MetricGroup({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rf-metric-strip ${className}`}>{children}</div>;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  label = "Search",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}) {
  return (
    <label className={`rf-search-input grid gap-1.5 text-sm ${className}`}>
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="rf-input min-h-11 w-full rounded-[8px] border border-line/80 bg-surface py-2 pl-9 pr-3 text-sm"
      />
    </label>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-b border-line/60 pb-4 lg:flex-row lg:flex-wrap lg:items-end">
      {children}
    </div>
  );
}

export function HeroMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rf-hero-metric">
      <p className="rf-hero-metric-label">{label}</p>
      <p className="rf-hero-metric-value">{value}</p>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

export function StatStrip({ children }: { children: ReactNode }) {
  return <div className="rf-stat-strip">{children}</div>;
}

export function StatCell({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rf-stat-cell">
      <p className="rf-stat-cell-label">{label}</p>
      <p className="rf-stat-cell-value">{value}</p>
    </div>
  );
}

export function EventStream({ children }: { children: ReactNode }) {
  return <div className="rf-event-stream">{children}</div>;
}

export function EventRow({
  time,
  title,
  detail,
  meta,
}: {
  time: string;
  title: string;
  detail?: string;
  meta?: ReactNode;
}) {
  return (
    <article className="rf-event-row">
      <time className="rf-event-time" dateTime={time}>
        {time}
      </time>
      <div className="min-w-0">
        <p className="rf-event-title">{title}</p>
        {detail ? <p className="rf-event-detail">{detail}</p> : null}
      </div>
      {meta ? <div className="text-right text-xs">{meta}</div> : null}
    </article>
  );
}

export function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-ink">{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useBodyScrollLock(true);

  return (
    <>
      <div className="rf-sheet-backdrop" onClick={onClose} aria-hidden />
      <aside className="rf-sheet" aria-labelledby="rf-sheet-title" role="dialog" aria-modal="true">
        <div className="rf-panel-header sticky top-0 z-10 border-b border-line/60 bg-surface">
          <h2 id="rf-sheet-title" className="text-lg font-semibold tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rf-motion-colors inline-flex min-h-11 min-w-11 items-center justify-center rounded-[8px] px-3 text-sm text-muted hover:bg-canvas-2 hover:text-ink"
            aria-label="Close sheet"
          >
            Close
          </button>
        </div>
        <div className="rf-panel-body">{children}</div>
      </aside>
    </>
  );
}

export function Dialog({
  title,
  onClose,
  children,
  footer,
  size = "default",
  testId,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "default" | "large";
  testId?: string;
}) {
  useBodyScrollLock(true);

  return (
    <div className="rf-overlay" role="presentation" onClick={onClose}>
      <div className="rf-overlay-backdrop" aria-hidden />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="rf-dialog-title"
        className={`rf-dialog rf-glass-l3 ${size === "large" ? "rf-dialog-lg" : ""}`}
        data-rf-glass-level="3"
        data-rf-glass-purpose="dialog"
        onClick={(event) => event.stopPropagation()}
        {...(testId ? { "data-testid": testId } : {})}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="rf-dialog-title" className="text-lg font-semibold tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rf-motion-colors inline-flex min-h-11 min-w-11 items-center justify-center rounded-[8px] text-sm text-muted hover:bg-canvas-2 hover:text-ink"
            aria-label="Close dialog"
          >
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
        {footer ? <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">{footer}</div> : null}
      </section>
    </div>
  );
}

export function Timeline({ children }: { children: ReactNode }) {
  return <div className="space-y-0">{children}</div>;
}

export function TimelineItem({
  title,
  detail,
  when,
  badge,
}: {
  title: string;
  detail: string;
  when: string;
  badge?: ReactNode;
}) {
  return (
    <article className="rf-timeline-item">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium text-ink">{title}</h3>
            {badge}
          </div>
          <p className="mt-1 text-sm text-ink-soft">{detail}</p>
        </div>
        <time className="shrink-0 text-xs text-muted" dateTime={when}>
          {when}
        </time>
      </div>
    </article>
  );
}

export function Panel({
  title,
  step,
  action,
  children,
  className = "",
  variant = "default",
  fill = false,
  ...props
}: HTMLAttributes<HTMLElement> & {
  title: string;
  step?: string;
  action?: ReactNode;
  children: ReactNode;
  variant?: "default" | "decision" | "transact" | "embedded";
  fill?: boolean;
}) {
  const variantClass =
    variant === "decision"
      ? "rf-desk-panel-decision"
      : variant === "transact"
        ? "rf-desk-panel-transact"
        : variant === "embedded"
          ? "rf-panel-embedded"
          : "";
  return (
    <section
      className={`rf-panel overflow-hidden ${variantClass} ${fill ? "rf-panel-fill" : ""} ${className}`}
      {...props}
    >
      <div className="rf-panel-header">
        <div className="rf-panel-header-title">
          {step ? <span className="rf-panel-step">{step}</span> : null}
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">{title}</h2>
        </div>
        {action}
      </div>
      <div className="rf-panel-body">{children}</div>
    </section>
  );
}

export type AlertTone = "info" | "success" | "warning" | "danger" | "blocked";

const alertToneClasses: Record<AlertTone, string> = {
  info: "border-[color-mix(in_oklab,var(--rf-info)_35%,var(--rf-line))] bg-[color-mix(in_oklab,var(--rf-info)_8%,var(--rf-surface))] text-ink",
  success:
    "border-[color-mix(in_oklab,var(--rf-success)_35%,var(--rf-line))] bg-[color-mix(in_oklab,var(--rf-success)_8%,var(--rf-surface))] text-ink",
  warning:
    "border-[color-mix(in_oklab,var(--rf-warning)_35%,var(--rf-line))] bg-[color-mix(in_oklab,var(--rf-warning)_8%,var(--rf-surface))] text-ink",
  danger:
    "border-[color-mix(in_oklab,var(--rf-danger)_35%,var(--rf-line))] bg-[color-mix(in_oklab,var(--rf-danger)_8%,var(--rf-surface))] text-ink",
  blocked:
    "border-[color-mix(in_oklab,var(--rf-blocked)_35%,var(--rf-line))] bg-[color-mix(in_oklab,var(--rf-blocked)_8%,var(--rf-surface))] text-ink",
};

export function Alert({
  tone = "info",
  title,
  children,
  className = "",
}: {
  tone?: AlertTone;
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={`rounded-[var(--rf-radius-panel)] border p-4 ${alertToneClasses[tone]} ${className}`}
    >
      <p className="rf-type-ui font-semibold">{title}</p>
      {children ? <div className="mt-1 rf-type-body text-ink-soft">{children}</div> : null}
    </div>
  );
}

export function Tabs({
  tabs,
  activeId,
  onChange,
  label = "Sections",
}: {
  tabs: Array<{ id: string; label: string }>;
  activeId: string;
  onChange: (id: string) => void;
  label?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1 rounded-[var(--rf-radius-control)] bg-canvas-2 p-1">
      {tabs.map((tab) => {
        const selected = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            id={`rf-tab-${tab.id}`}
            aria-controls={`rf-tabpanel-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={`rf-motion-colors min-h-11 rounded-[var(--rf-radius-control)] px-4 rf-type-ui ${
              selected
                ? "bg-[var(--rf-bg-primary)] text-ink shadow-[var(--rf-shadow-e1)] ring-1 ring-line"
                : "text-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  id,
  labelledBy,
  children,
  hidden,
}: {
  id: string;
  labelledBy: string;
  children: ReactNode;
  hidden?: boolean;
}) {
  return (
    <div
      role="tabpanel"
      id={`rf-tabpanel-${id}`}
      aria-labelledby={labelledBy}
      hidden={hidden}
      className="pt-4"
    >
      {hidden ? null : children}
    </div>
  );
}

export function Tooltip({
  content,
  children,
}: {
  content: string;
  children: ReactNode;
}) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        data-rf-glass-level="2"
        data-rf-glass-purpose="tooltip"
        className="rf-glass-l2 pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[16rem] -translate-x-1/2 px-2.5 py-1.5 text-[var(--rf-type-meta)] text-ink opacity-0 transition-opacity duration-[var(--rf-duration-micro)] group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {content}
      </span>
    </span>
  );
}

export function Toast({
  title,
  detail,
  tone = "info",
}: {
  title: string;
  detail?: string;
  tone?: AlertTone;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`rf-surface-canvas w-full max-w-sm rounded-[var(--rf-radius-panel)] border p-4 shadow-[var(--rf-shadow-e2)] ${alertToneClasses[tone]}`}
    >
      <p className="rf-type-ui font-semibold">{title}</p>
      {detail ? <p className="mt-0.5 rf-type-meta text-ink-soft">{detail}</p> : null}
    </div>
  );
}

export { SettlementLine, SettlementGate } from "@/components/ui/settlement-primitives";
