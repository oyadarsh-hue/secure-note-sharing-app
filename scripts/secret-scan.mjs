import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { config } from "dotenv";
config({ quiet: true });
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
if (!files.length)
  throw new Error("Stage the intended release files before scanning.");
const sensitiveValues = ["NEXTAUTH_SECRET", "DEMO_PASSWORD"]
  .map((k) => process.env[k])
  .filter((v) => v && v.length >= 12);
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{40,}\b/,
  /\bAKIA[A-Z0-9]{16}\b/,
];
const failures = [];
for (const file of files) {
  if (/(^|\/)\.env(\.|$)/.test(file) && file !== ".env.example")
    failures.push(`${file}: environment file`);
  if (/(^|\/)(node_modules|\.next|test-results|playwright-report)\//.test(file))
    failures.push(`${file}: generated output`);
  const text = readFileSync(file, "utf8");
  if (patterns.some((p) => p.test(text)))
    failures.push(`${file}: credential pattern`);
  if (sensitiveValues.some((v) => text.includes(v)))
    failures.push(`${file}: configured private value`);
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `PASS: ${files.length} tracked files; no forbidden environment/build files, configured secrets, or credential patterns detected. Manual review remains necessary.`,
  );
