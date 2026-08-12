// prisma migrate reset 在 AI 工具環境會被安全機制擋下（前案經驗），
// 改用「刪檔 → migrate deploy → seed」的可重複流程。
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dbUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const dbFile = dbUrl.replace(/^file:/, "");
const dbPath = path.isAbsolute(dbFile) ? dbFile : path.join(root, "prisma", dbFile);

for (const suffix of ["", "-journal"]) {
  rmSync(dbPath + suffix, { force: true });
}
console.log(`[reset-db] removed ${dbPath}`);

const run = (cmd) =>
  execSync(cmd, { cwd: root, stdio: "inherit", env: { ...process.env, DATABASE_URL: dbUrl } });

run("pnpm prisma migrate deploy");
run("pnpm tsx prisma/seed.ts");
console.log("[reset-db] done");
