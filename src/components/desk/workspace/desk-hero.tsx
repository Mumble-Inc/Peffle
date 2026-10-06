"use client";

import Image from "next/image";
import { ArrowsLeftRight, ChartLineUp, Sparkle } from "@phosphor-icons/react";
import type { DemoPrompt } from "@/lib/agent/demo-prompts";
import type { PublicProduct } from "@/lib/agent/types";

export function DeskHero({
  heroImage,
  heroAlt,
  merchantName,
  demoPrompts,
  onChip,
}: {
  heroImage: string | null;
  heroAlt: string;
  merchantName: string;
  demoPrompts: DemoPrompt[];
  onChip: (text: string) => void;
}) {
  return (
    <section className="rf-peffle-hero" aria-label="Commerce desk">
      {heroImage ? (
        <div className="rf-peffle-hero-media">
          <Image src={heroImage} alt={heroAlt} fill sizes="80vw" priority />
        </div>
      ) : null}
      <div className="rf-peffle-hero-copy">
        <p className="rf-peffle-hero-kicker">{merchantName}</p>
        <h1>
          Shop {merchantName}.
          <br />
          <span>Within policy.</span>
        </h1>
        <p className="rf-peffle-hero-lead">
          Search the catalog, compare options, and check policy before checkout.
        </p>
        <div className="rf-peffle-chips">
          <button type="button" onClick={() => onChip("Find me wireless headphones under ₹15,000 with good ANC")}>
            <Sparkle className="size-3.5" aria-hidden />
            Recommend under ₹15,000
          </button>
          <button
            type="button"
            onClick={() => onChip("Compare the best over-ear headphones for travel")}
          >
            <ArrowsLeftRight className="size-3.5" aria-hidden />
            Compare travel options
          </button>
          <button type="button" onClick={() => onChip("Show the best headphones and earbuds in the catalog")}>
            <ChartLineUp className="size-3.5" aria-hidden />
            Show bestsellers
          </button>
        </div>
        <div className="sr-only">
          {demoPrompts.map((prompt) => (
            <button
              key={prompt.id}
              type="button"
              data-testid={`demo-prompt-${prompt.id}`}
              onClick={() => onChip(prompt.text)}
            >
              {prompt.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function pickHeroProduct(catalog: PublicProduct[]): PublicProduct | null {
  return (
    catalog.find((product) => product.metadata?.demoPrimary === true) ??
    catalog.find((product) => product.sku === "halo-anc") ??
    catalog[0] ??
    null
  );
}
