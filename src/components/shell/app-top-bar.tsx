"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { List, ShieldCheck, Storefront, X } from "@phosphor-icons/react";
import { AccountTopBarActions } from "@/components/auth/account-top-bar-actions";
import { useAuthSession } from "@/components/auth/use-auth-session";
import { Mark } from "@/components/mark";
import { ButtonLink } from "@/components/ui/design-system";
import { PUBLIC_NAV } from "@/components/shell/nav-config";
import { useScrollCollapse } from "@/components/shell/use-scroll-collapse";
import { isStaffOrAdmin } from "@/lib/auth/capability";

type AppTopBarProps = {
  variant: "public" | "desk" | "admin";
  merchantName?: string;
  sessionLabel?: string | null;
  pageTitle?: string;
  secondary?: ReactNode;
  sessionId?: string | null;
  actions?: ReactNode;
};

function isPublicNavActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function PublicMobileNav({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const guardrailsHref = pathname === "/" ? "#guardrails-heading" : "/#guardrails-heading";

  return (
    <div className="relative sm:hidden">
      <button
        type="button"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[8px] text-ink-soft hover:text-ink"
        aria-expanded={open}
        aria-controls="public-mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X className="size-5" aria-hidden /> : <List className="size-5" aria-hidden />}
      </button>
      {open ? (
        <nav
          id="public-mobile-nav"
          aria-label="Primary"
          className="rf-elevated absolute right-0 top-full z-50 mt-2 w-52 p-2"
        >
          <Link
            href="/desk"
            className="flex min-h-11 items-center rounded-[8px] px-3 text-sm text-ink hover:bg-canvas-2"
            onClick={() => setOpen(false)}
          >
            Desk
          </Link>
          <a
            href={guardrailsHref}
            className="flex min-h-11 items-center rounded-[8px] px-3 text-sm text-ink hover:bg-canvas-2"
            onClick={() => setOpen(false)}
          >
            Guardrails
          </a>
        </nav>
      ) : null}
    </div>
  );
}

export function AppTopBar({
  variant,
  merchantName,
  sessionLabel,
  pageTitle,
  secondary,
  sessionId = null,
  actions,
}: AppTopBarProps) {
  const collapsed = useScrollCollapse(variant === "public");
  const pathname = usePathname();
  const auth = useAuthSession();
  const showStaffPoliciesLink =
    !auth.loading && auth.authenticated && isStaffOrAdmin(auth.capability);
  const isLanding = variant === "public" && pathname === "/";
  const guardrailsHref = isLanding ? "#guardrails-heading" : "/#guardrails-heading";
  const publicNav = isLanding
    ? PUBLIC_NAV.filter((link) => link.href === "/desk")
    : PUBLIC_NAV.filter((link) => link.href !== "/admin");

  return (
    <header className="rf-app-topbar" data-collapsed={collapsed ? "true" : "false"}>
      <div className="rf-app-topbar-shell">
        <div className="rf-app-topbar-primary">
          <div className="mx-auto flex h-full max-w-[96rem] items-center justify-between gap-4 px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/" className="flex shrink-0 items-center gap-2 text-ink">
                <Mark className="size-5 text-accent" />
                <span className="text-sm font-semibold tracking-tight" translate="no">
                  Peffle
                </span>
              </Link>

              {variant === "public" ? null : (
                <>
                  <span className="hidden text-line sm:inline" aria-hidden>
                    /
                  </span>
                  <div className="min-w-0 rf-topbar-context">
                    <p className="truncate text-sm font-medium tracking-tight">
                      {variant === "desk" ? "Commerce desk" : (pageTitle ?? "Control")}
                    </p>
                    {merchantName ? (
                      <p className="truncate text-xs text-muted" translate="no">
                        {merchantName}
                      </p>
                    ) : null}
                  </div>
                </>
              )}
            </div>

            {variant === "public" ? (
              <div className="flex min-w-0 items-center gap-1.5 sm:gap-3 shrink-0">
                <PublicMobileNav pathname={pathname} />
                <nav aria-label="Primary" className="hidden min-w-0 items-center gap-0.5 sm:flex sm:gap-1">
                  {publicNav.map((link) => {
                    const active = isPublicNavActive(pathname, link.href, link.exact);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        className="rf-nav-item rf-motion-colors rounded-[6px] px-2.5 py-1.5 text-sm text-ink-soft hover:text-ink sm:px-3"
                        data-active={active ? "true" : "false"}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                  {isLanding ? (
                    <a
                      href={guardrailsHref}
                      className="rf-nav-item rf-motion-colors rounded-[6px] px-2.5 py-1.5 text-sm text-ink-soft hover:text-ink sm:px-3"
                    >
                      Guardrails
                    </a>
                  ) : null}
                </nav>
                {isLanding ? (
                  <ButtonLink href="/desk" className="hidden min-h-11 sm:inline-flex">
                    Open the desk
                  </ButtonLink>
                ) : null}
                <AccountTopBarActions sessionId={sessionId} />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {actions}
                <AccountTopBarActions sessionId={sessionId} />
                {variant === "desk" ? (
                  showStaffPoliciesLink ? (
                    <Link
                      href="/admin/policies"
                      className="rf-workspace-switch rf-motion-colors inline-flex min-h-9 items-center gap-1.5 rounded-[8px] border border-line/70 bg-surface px-3 text-sm text-ink-soft hover:text-ink"
                    >
                      <ShieldCheck className="size-4" aria-hidden />
                      <span className="hidden sm:inline">Policies</span>
                    </Link>
                  ) : null
                ) : (
                  <>
                    <Link
                      href="/admin/policies"
                      className="rf-workspace-switch rf-motion-colors inline-flex min-h-9 items-center gap-1.5 rounded-[8px] border border-line/70 bg-surface px-3 text-sm text-ink-soft hover:text-ink lg:hidden"
                    >
                      <ShieldCheck className="size-4" aria-hidden />
                      <span className="hidden sm:inline">Policies</span>
                    </Link>
                    <Link
                      href="/desk"
                      className="rf-workspace-switch rf-motion-colors inline-flex min-h-9 items-center gap-1.5 rounded-[8px] bg-accent px-3 text-sm font-medium text-white hover:bg-accent-hover"
                    >
                      <Storefront className="size-4" aria-hidden />
                      <span className="hidden sm:inline">Open desk</span>
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {secondary ? <div className="rf-app-topbar-secondary">{secondary}</div> : null}
    </header>
  );
}
