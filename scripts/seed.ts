/**
 * Manual seed runner: `npm run db:seed`
 * Loads .env from the project root, then runs the shared seed.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

process.env.AUTO_SEED = "true";

async function run() {
  const { ensureSeed } = await import("../src/server/seed");
  await ensureSeed();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
