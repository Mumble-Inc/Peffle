#!/usr/bin/env tsx
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

dotenv.config({ path: path.join(process.cwd(), ".env") });
dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: true });

const POLICY_PATH = path.join(process.cwd(), "peffle.policy.json");
const LEDGER = path.join(process.cwd(), ".peffle/ledger.db");
const NUMBERS_JSON = path.join(process.cwd(), "docs/demo-numbers.json");
const NUMBERS_MD = path.join(process.cwd(), "docs/demo-numbers.md");

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("demo:seed is for local/dev only");
  }

  const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8")) as {
    budgets: Array<{ id: string; limit: number }>;
  };
  for (const budget of policy.budgets) {
    if (budget.id === "discount-daily-cap") budget.limit = 50_000;
  }
  fs.writeFileSync(POLICY_PATH, `${JSON.stringify(policy, null, 2)}\n`);

  try {
    fs.unlinkSync(LEDGER);
  } catch {
    // no ledger yet
  }

  const prisma = new PrismaClient();
  await prisma.$connect();
  const merchantId = process.env.DEMO_MERCHANT_ID?.trim() || "northline-audio";
  const halo = await prisma.product.findFirstOrThrow({ where: { merchantId, sku: "halo-anc" } });
  const merchantPolicy = await prisma.policy.findUniqueOrThrow({ where: { merchantId } });
  const marginPct = Number((((halo.pricePaise - halo.costPaise) / halo.pricePaise) * 100).toFixed(2));

  const numbers = {
    product: {
      sku: halo.sku,
      name: halo.name,
      pricePaise: halo.pricePaise,
      costPaise: halo.costPaise,
      marginPct,
    },
    merchantPolicy: {
      marginFloorPct: merchantPolicy.marginFloorPct,
      discountCeilingPct: merchantPolicy.discountCeilingPct,
    },
    peffle: {
      discountBudgetPaise: 50_000,
      budgetScope: "global",
      budgetWindow: "daily",
    },
    demoDiscounts: {
      passesPaise: 20_000,
      commerceBlockedPct: 20,
      exhaustAsksPaise: [20_000, 40_000, 80_000],
    },
  };

  fs.mkdirSync(path.dirname(NUMBERS_JSON), { recursive: true });
  fs.writeFileSync(NUMBERS_JSON, `${JSON.stringify(numbers, null, 2)}\n`);
  fs.writeFileSync(
    NUMBERS_MD,
    [
      "# Demo numbers",
      "",
      "Written by `npm run demo:seed` from the live catalog row. Amounts are integer paise.",
      "",
      `| field | value |`,
      `|---|---|`,
      `| product | ${halo.name} (\`${halo.sku}\`) |`,
      `| price | ${halo.pricePaise} paise |`,
      `| cost | ${halo.costPaise} paise |`,
      `| list margin | ${marginPct}% |`,
      `| margin floor | ${merchantPolicy.marginFloorPct}% |`,
      `| discount ceiling | ${merchantPolicy.discountCeilingPct}% |`,
      `| Peffle discount budget | 50000 paise, global, daily |`,
      `| discount that passes | 20000 paise (₹200 off) |`,
      `| commerce block | 20% off (above ${merchantPolicy.discountCeilingPct}% ceiling) |`,
      `| budget exhaustion | 20000 then 40000 then 80000 paise asks on the same product |`,
      "",
    ].join("\n"),
  );

  console.info("demo:seed discount-daily-cap=50000 paise, reset .peffle/ledger.db");
  console.info(`demo product ${halo.name} ${halo.pricePaise} paise`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
