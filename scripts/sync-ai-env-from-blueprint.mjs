#!/usr/bin/env node
/**
 * Copy AI keys from ../project-blueprint/.env.local into this repo's .env.local.
 * Does not print secret values. Safe to re-run.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "..", "project-blueprint", ".env.local");
const target = path.join(root, ".env.local");

const KEYS = [
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "GROQ_API_KEY",
  "GROQ_MODEL",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "NEXT_PUBLIC_RAZORPAY_KEY_ID",
];

function parseEnv(text) {
  const map = new Map();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    map.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
  }
  return map;
}

function upsert(lines, key, value) {
  const prefix = `${key}=`;
  const idx = lines.findIndex((line) => line.startsWith(prefix));
  const row = `${key}=${value}`;
  if (idx === -1) lines.push(row);
  else lines[idx] = row;
}

if (!fs.existsSync(source)) {
  console.error(`Missing ${source}. Expected project-blueprint beside this repo.`);
  process.exit(1);
}

const src = parseEnv(fs.readFileSync(source, "utf8"));
const lines = fs.existsSync(target) ? fs.readFileSync(target, "utf8").split("\n") : [];

let copied = 0;
for (const key of KEYS) {
  const value = src.get(key)?.trim();
  if (!value) continue;
  upsert(lines, key, value);
  copied += 1;
}

fs.writeFileSync(target, `${lines.filter((line, i, arr) => line.length || i < arr.length - 1).join("\n")}\n`);
console.log(`sync-ai-env: updated ${copied} keys in .env.local from project-blueprint`);
