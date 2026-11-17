/**
 * Backfill `pairKey` on conversations and swap indexes for correct DM uniqueness.
 * Run once against each environment: `npm run db:migrate-conversations`
 */
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

function pairKeyFromParticipants(participants: string[]): string | null {
  const ids = participants.map(String).filter(Boolean);
  if (ids.length !== 2) return null;
  const [p1, p2] = ids[0] < ids[1] ? ids : [ids[1], ids[0]];
  return `${p1}:${p2}`;
}

async function run() {
  const { connectDB } = await import("../src/lib/db");
  const { Conversation } = await import("../src/models");
  await connectDB();

  const missing = await Conversation.find({
    $or: [{ pairKey: { $exists: false } }, { pairKey: "" }],
  })
    .select("participants pairKey bookingId")
    .lean();

  let updated = 0;
  for (const doc of missing) {
    const key = pairKeyFromParticipants(doc.participants as string[]);
    if (!key) continue;
    await Conversation.updateOne({ _id: doc._id }, { $set: { pairKey: key } });
    updated += 1;
  }
  console.log(`[migrate] backfilled pairKey on ${updated} conversation(s)`);

  const collection = Conversation.collection;
  const indexes = await collection.indexes();
  const hasLegacy = indexes.some((i) => i.name === "participants_1_bookingId_1");
  if (hasLegacy) {
    await collection.dropIndex("participants_1_bookingId_1");
    console.log("[migrate] dropped legacy index participants_1_bookingId_1");
  }

  await Conversation.syncIndexes();
  console.log("[migrate] synced conversation indexes");
  process.exit(0);
}

run().catch((err) => {
  console.error("[migrate] failed:", err);
  process.exit(1);
});