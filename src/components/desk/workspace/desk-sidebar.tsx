"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartLineUp,
  ClipboardText,
  House,
  Package,
  ShieldCheck,
  SlidersHorizontal,
} from "@phosphor-icons/react";
import { Mark } from "@/components/mark";
import { capabilityLabel, isStaffOrAdmin, type BuyerCapability } from "@/lib/auth/capability";

const BUYER_NAV = [
  { href: "/desk", label: "Desk", icon: House, exact: true },
  { href: "/desk#catalog", label: "Catalog", icon: Package },
] as const;

const STAFF_NAV = [
  { href: "/admin/orders", label: "Orders", icon: ClipboardText },
  { href: "/admin/policies", label: "Policies", icon: ShieldCheck },
  { href: "/admin", label: "Control", icon: SlidersHorizontal, exact: true },
  { href: "/admin/insights", label: "Analytics", icon: ChartLineUp },
] as const;

function initialsFromEmail(email: string | null) {
  if (!email) return "—";
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  return local.slice(0, 2).toUpperCase() || "—";
}

export function DeskModeCard({
  merchantName,
  demoAvailable,
  demoOn,
  onDemoChange,
}: {
  merchantName: string;
  demoAvailable: boolean;
  demoOn: boolean;
  onDemoChange: (next: boolean) => void;
}) {
  if (!demoAvailable) return null;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={demoOn}
      aria-label={demoOn ? `Demo Mode, exploring as ${merchantName}` : `Live desk, ${merchantName}`}
      data-testid="demo-mode-toggle"
      className="rf-peffle-demo-card"
      data-on={demoOn ? "true" : "false"}
      onClick={() => {
        const next = !demoOn;
        try {
          sessionStorage.setItem("razorflow-demo-mode", next ? "1" : "0");
        } catch {
          // session-only
        }
        onDemoChange(next);
      }}
    >
      <span className="rf-peffle-demo-dot" aria-hidden />
      <span className="rf-peffle-demo-label">{demoOn ? "Demo Mode" : "Live desk"}</span>
    </button>
  );
}

export function DeskSidebar({
  merchantName,
  email,
  capability,
  authenticated,
}: {
  merchantName: string;
  email: string | null;
  capability: BuyerCapability;
  authenticated: boolean;
}) {
  const pathname = usePathname();
  const showStaffNav = authenticated && isStaffOrAdmin(capability);
  const identityEmail = authenticated ? (email ?? "Account") : "Guest";
  const nav = showStaffNav ? [...BUYER_NAV, ...STAFF_NAV] : [...BUYER_NAV];

  return (
    <aside className="rf-peffle-desk-sidebar">
      <Link href="/" className="rf-peffle-desk-brand">
        <Mark className="size-6 text-accent" />
        <div className="rf-peffle-desk-brand-copy">
          <p translate="no">Peffle</p>
          <p>AI Commerce. Controlled.</p>
        </div>
      </Link>

      <nav className="rf-peffle-desk-nav" aria-label="Desk">
        {nav.map((item) => {
          const Icon = item.icon;
          const active =
            item.label === "Desk"
              ? pathname === "/desk"
              : "exact" in item && item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.label} href={item.href} data-active={active ? "true" : "false"}>
              <Icon className="size-4" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="rf-peffle-desk-sidebar-foot">
        <div className="rf-peffle-identity">
          <span className="rf-peffle-avatar" aria-hidden>
            {initialsFromEmail(email)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[0.75rem] font-medium">{identityEmail}</span>
            <span className="block truncate text-[0.6875rem] text-muted">
              {authenticated ? capabilityLabel(capability) : "Guest"} · {merchantName}
            </span>
          </span>
        </div>
      </div>
    </aside>
  );
}
