"use client";

import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import NumberFlow from "@number-flow/react";
import { Check, Star } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useState } from "react";

export interface PricingPlan {
  name: string;
  /** Numeric list price (e.g. pay-as-you-go credits). */
  price?: string;
  /** Non-numeric price label (Custom, Partner). */
  priceDisplay?: string;
  yearlyPrice?: string;
  period: string;
  features: string[];
  description: string;
  buttonText: string;
  href: string;
  isPopular: boolean;
  footnote?: string;
  /** When true, toggle switches between per-1k and per-action display (Pay as you go only). */
  showUsageToggle?: boolean;
}

export interface PricingProps {
  plans: PricingPlan[];
  title?: string;
  description?: string;
  /** Peffle: usage toggle instead of fake annual SaaS discount. */
  enableUsageUnitToggle?: boolean;
}

export function Pricing({
  plans,
  title = "Simple, transparent pricing",
  description = "Choose how you work with Peffle.",
  enableUsageUnitToggle = true,
}: PricingProps) {
  const [perActionView, setPerActionView] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const reduceMotion = useReducedMotion();
  const showToggle =
    enableUsageUnitToggle && plans.some((plan) => plan.showUsageToggle && plan.price);

  return (
    <div className="mx-auto w-full max-w-6xl">
      {title || description ? (
        <div className="mx-auto max-w-2xl text-center">
          {title ? (
            <h2 className="text-lg font-semibold tracking-tight text-ink md:text-xl">{title}</h2>
          ) : null}
          {description ? (
            <p className={cn("text-sm leading-relaxed text-muted whitespace-pre-line", title && "mt-2")}>
              {description}
            </p>
          ) : null}
        </div>
      ) : null}

      {showToggle ? (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Label htmlFor="usage-unit-toggle" className="text-sm text-ink-soft">
            Per 1,000 governed actions
          </Label>
          <Switch
            id="usage-unit-toggle"
            checked={perActionView}
            onCheckedChange={setPerActionView}
            aria-label="Show per-action equivalent for pay as you go"
          />
          <Label htmlFor="usage-unit-toggle" className="text-sm text-ink-soft">
            Per action (₹0.049)
          </Label>
        </div>
      ) : null}

      <div
        className={cn(
          "mt-8 grid gap-4",
          isDesktop ? "grid-cols-3" : "grid-cols-1",
        )}
      >
        {plans.map((plan, index) => {
          const numericPrice = plan.price
            ? perActionView && plan.showUsageToggle
              ? (Number(plan.price) / 1000).toFixed(3)
              : plan.price
            : null;
          const currencyPrefix = plan.priceDisplay ? "" : "₹";

          return (
            <motion.div
              key={plan.name}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: reduceMotion ? 0 : index * 0.05 }}
              className={cn(
                "relative flex flex-col rounded-[12px] border border-line/80 bg-surface p-5 shadow-[var(--rf-shadow-e1)]",
                plan.isPopular && "border-[color-mix(in_oklab,var(--primary)_35%,var(--rf-line))]",
              )}
            >
              {plan.isPopular ? (
                <div className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-line/70 bg-canvas px-2.5 py-0.5 text-[0.6875rem] font-medium uppercase tracking-wide text-ink">
                  <Star className="size-3.5 text-accent" weight="fill" aria-hidden />
                  Popular
                </div>
              ) : null}

              <div className="flex flex-1 flex-col gap-4 pt-1">
                <div>
                  <p className="text-sm font-semibold tracking-tight text-ink">{plan.name}</p>
                  <div className="mt-3 flex items-baseline gap-1 font-mono tabular-nums">
                    {plan.priceDisplay ? (
                      <span className="text-2xl font-semibold text-ink">{plan.priceDisplay}</span>
                    ) : numericPrice ? (
                      <>
                        <span className="text-sm text-muted">{currencyPrefix}</span>
                        <NumberFlow
                          value={Number(numericPrice)}
                          format={{
                            minimumFractionDigits: perActionView && plan.showUsageToggle ? 3 : 0,
                            maximumFractionDigits: perActionView && plan.showUsageToggle ? 3 : 0,
                          }}
                          className="text-2xl font-semibold text-ink"
                        />
                      </>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted">{plan.period}</p>
                  {plan.footnote ? (
                    <p className="mt-2 text-xs text-muted">{plan.footnote}</p>
                  ) : null}
                </div>

                <ul className="flex flex-1 flex-col gap-2 border-t border-line/60 pt-4 text-sm text-ink-soft">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-accent" weight="bold" aria-hidden />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto space-y-2 pt-2">
                  <Link
                    href={plan.href}
                    className={cn(
                      buttonVariants({
                        variant: plan.isPopular ? "default" : "outline",
                        size: "lg",
                      }),
                      "w-full",
                    )}
                  >
                    {plan.buttonText}
                  </Link>
                  <p className="text-center text-xs text-muted">{plan.description}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
