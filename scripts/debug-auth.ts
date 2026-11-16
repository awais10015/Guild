import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function run() {
  const { connectDB } = await import("../src/lib/db");
  await connectDB();
  const { getAuth } = await import("../src/lib/auth");
  const auth = await getAuth();
  try {
    const res = await auth.api.signUpEmail({
      body: { name: "Debug User", email: `debug${Date.now()}@test.guild.app`, password: "Test@1234" },
    });
    console.log("SIGNUP OK:", JSON.stringify(res?.user ?? res).slice(0, 400));
  } catch (err: unknown) {
    console.error("SIGNUP FAILED:", JSON.stringify(err, Object.getOwnPropertyNames(err as object), 2).slice(0, 1500));
  }
  process.exit(0);
}

run();
