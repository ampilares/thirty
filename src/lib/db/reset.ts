/**
 * Rebuilds data/thirty.db from scratch: drops the file, pushes the schema
 * via drizzle-kit, then seeds demo data. Run with: npm run db:reset
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const dbPath = path.join(process.cwd(), "data", "thirty.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
for (const suffix of ["", "-journal", "-wal", "-shm"]) {
  const p = dbPath + suffix;
  if (fs.existsSync(p)) fs.rmSync(p);
}
console.log("Recreating schema…");
execSync("npx drizzle-kit push --force", { stdio: "inherit" });

console.log("Seeding demo data…");
execSync("npx tsx src/lib/db/seed.ts", { stdio: "inherit" });
