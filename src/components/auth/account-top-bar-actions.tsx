"use client";

import { useState } from "react";
import { Gauge, SignIn } from "@phosphor-icons/react";
import Link from "next/link";
import { AccountMenu } from "@/components/auth/account-menu";
import { AccountAuthModal } from "@/components/auth/account-auth-modal";
import { useAuthSession } from "@/components/auth/use-auth-session";
import { isStaffOrAdmin } from "@/lib/auth/capability";

/** Matches public homepage `/` header login control */
export const TOPBAR_LOGIN_CLASS =
  "rf-topbar-login rf-motion-colors relative inline-flex min-h-11 items-center gap-1.5 rounded-[8px] border border-line/70 bg-surface px-3 text-sm text-ink-soft hover:text-ink sm:min-h-11";

type AccountTopBarActionsProps = {
  sessionId?: string | null;
  merchantName?: string;
  className?: string;
  /** Small accent dot (desk guest reminder) */
  showGuestAttentionDot?: boolean;
};

export function AccountTopBarActions({
  sessionId,
  merchantName,
  className = "",
  showGuestAttentionDot = false,
}: AccountTopBarActionsProps) {
  const auth = useAuthSession();
  const [modalOpen, setModalOpen] = useState(false);

  const showAdminLink =
    !auth.loading && auth.authenticated && isStaffOrAdmin(auth.capability);

  function openLogin() {
    setModalOpen(true);
  }

  return (
    <>
      <div className={`flex items-center gap-1.5 sm:gap-3 ${className}`}>
        {auth.authenticated ? (
          <>
            <AccountMenu onLogout={() => void auth.logout()} />
            {showAdminLink ? (
              <Link
                href="/admin"
                aria-label="Admin"
                className="rf-workspace-switch rf-motion-colors inline-flex min-h-11 items-center gap-1.5 rounded-[8px] border border-line/70 bg-surface px-3 text-sm text-ink-soft hover:text-ink"
              >
                <Gauge className="size-4" aria-hidden />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            ) : null}
          </>
        ) : (
          <button
            type="button"
            aria-label="Log in"
            data-testid="topbar-login"
            className={TOPBAR_LOGIN_CLASS}
            onClick={openLogin}
          >
            <span>Log in</span>
            <SignIn className="size-4 shrink-0 text-muted" weight="regular" aria-hidden />
            {showGuestAttentionDot ? (
              <span
                className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-accent ring-2 ring-canvas"
                aria-hidden
              />
            ) : null}
          </button>
        )}
      </div>

      <AccountAuthModal
        open={modalOpen}
        initialMode="login"
        sessionId={sessionId}
        merchantName={merchantName}
        onClose={() => setModalOpen(false)}
        onAuthStateChange={() => void auth.refresh()}
      />
    </>
  );
}
