"use client";

import { AccountTopBarActions } from "@/components/auth/account-top-bar-actions";
import { Container } from "@/components/marketing/Container";
import { GlassButton } from "@/components/marketing/GlassButton";
import { GlassTabs } from "@/components/marketing/GlassTabs";
import { LANDING_GLASS_TABS } from "@/components/marketing/landing-tabs";
import { LogoChip } from "@/components/marketing/LogoChip";
import { PrimaryButton } from "@/components/marketing/PrimaryButton";

export function SiteHeader() {
  return (
    <>
      <header className="m-header">
        <div className="m-header__fade" aria-hidden />
        <Container className="m-header__bar">
          <div className="m-header__start">
            <LogoChip href="/#top" />
          </div>
          <div className="m-header__center m-header__center-tabs">
            <GlassTabs tabs={LANDING_GLASS_TABS} defaultId="home" />
          </div>
          <div className="m-header__actions">
            <GlassButton reflective href="/pricing" className="m-header__learn m-header__pricing">
              Pricing
            </GlassButton>
            <GlassButton reflective href="/#how-it-works" className="m-header__learn">
              Learn more
            </GlassButton>
            <PrimaryButton href="/desk" className="m-header__download">
              Open the desk
            </PrimaryButton>
            <GlassButton reflective href="#site-footer" className="m-header__menu">
              <span className="m-header__menu-icon" aria-hidden>
                <span />
                <span />
              </span>
              Menu
            </GlassButton>
            <AccountTopBarActions className="m-header__login" />
          </div>
        </Container>
      </header>
      <div className="m-header-spacer" aria-hidden />
    </>
  );
}
