#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const major = Number(process.versions.node.split(".")[0]);
if (major >= 26) {
  console.warn(
    "[peffle] Node %s is not supported for better-sqlite3 yet. Use Node 22 LTS (see .nvmrc), then npm install.",
    process.versions.node,
  );
  process.exit(0);
}

const require = createRequire(import.meta.url);
let sqlitePath;
try {
  sqlitePath = require.resolve("better-sqlite3/package.json");
} catch {
  process.exit(0);
}

const result = spawnSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["rebuild", "better-sqlite3", "--foreground-scripts"],
  { stdio: "inherit", env: process.env },
);

if (result.status !== 0) {
  console.warn("[peffle] better-sqlite3 rebuild failed; checkout guard may not work until it succeeds.");
}
