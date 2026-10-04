#!/usr/bin/env tsx
import dotenv from "dotenv";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

dotenv.config({ path: path.join(process.cwd(), ".env") });
dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: true });

type Check = { name: string; ok: boolean; detail: string };

function present(name: string) {
  return Boolean(process.env[name]?.trim());
}

async function canConnectDb(): Promise<Check> {
  if (!present("DATABASE_URL")) return { name: "database", ok: false, detail: "DATABASE_URL missing" };
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    return { name: "database", ok: true, detail: "SELECT 1 ok" };
  } catch (error) {
    return { name: "database", ok: false, detail: error instanceof Error ? error.message : "db failed" };
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

function ledgerWritable(): Check {
  const storage = process.env.PEFFLE_STORAGE?.trim() || ".peffle/ledger.db";
  if (storage === ":memory:") return { name: "ledger", ok: true, detail: ":memory:" };
  try {
    const dir = path.dirname(path.resolve(storage));
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    fs.accessSync(dir, fs.constants.W_OK);
    return { name: "ledger", ok: true, detail: dir };
  } catch (error) {
    return { name: "ledger", ok: false, detail: error instanceof Error ? error.message : "not writable" };
  }
}

async function singleNode(): Promise<Check> {
  if (process.env.VERCEL) {
    return { name: "single-node", ok: false, detail: "VERCEL is set; Peffle ledger is process-local, not serverless-safe" };
  }
  const port = Number(process.env.PREFLIGHT_LOCK_PORT ?? 30109);
  return await new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => {
      resolve({ name: "single-node", ok: false, detail: `port ${port} already bound; run one Node server` });
    });
    server.listen(port, "127.0.0.1", () => {
      server.close(() => {
        resolve({ name: "single-node", ok: true, detail: "no extra lock listener" });
      });
    });
  });
}

async function main() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() ?? "";
  const checks: Check[] = [
    { name: "DATABASE_URL", ok: present("DATABASE_URL"), detail: present("DATABASE_URL") ? "set" : "missing" },
    await canConnectDb(),
    {
      name: "GEMINI_API_KEY",
      ok: present("GEMINI_API_KEY"),
      detail: present("GEMINI_API_KEY") ? `set, model ${process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash"}` : "missing",
    },
    {
      name: "RAZORPAY_TEST_KEYS",
      ok: keyId.startsWith("rzp_test_") && present("RAZORPAY_KEY_SECRET"),
      detail: keyId.startsWith("rzp_test_") ? "rzp_test key id present" : "missing or not Test Mode",
    },
    ledgerWritable(),
    await singleNode(),
    { name: "PEFFLE_POLICY", ok: fs.existsSync(process.env.PEFFLE_POLICY?.trim() || "peffle.policy.json"), detail: "peffle.policy.json" },
  ];

  for (const check of checks) {
    console.log(`${check.ok ? "PASS" : "FAIL"}  ${check.name}  ${check.detail}`);
  }
  if (checks.some((check) => !check.ok)) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
