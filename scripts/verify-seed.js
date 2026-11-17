/* Verify Guild seed data — uses MONGODB_URI / DB_NAME from .env when present */
const { readFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");
const m = require("mongodb");

const envPath = resolve(__dirname, "../.env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

const DEFAULT_URI =
  "mongodb://127.0.0.1:27017/guild?replicaSet=rs0&directConnection=true";
const uri = process.env.MONGODB_URI || DEFAULT_URI;

function dbName() {
  const fromEnv = process.env.DB_NAME?.trim();
  if (fromEnv) return fromEnv;
  try {
    const path = new URL(uri).pathname.replace(/^\//, "").split("/")[0];
    if (path) return path.split("?")[0] || "guild";
  } catch {
    /* fall through */
  }
  return "guild";
}

(async () => {
  const c = await m.MongoClient.connect(uri);
  const d = c.db(dbName());
  console.log(
    "users:", await d.collection("user").countDocuments({}),
    "| services:", await d.collection("services").countDocuments({}),
    "| bookings:", await d.collection("bookings").countDocuments({}),
  );
  const demoBookings = await d.collection("bookings").countDocuments({
    bookingNumber: { $regex: /^BK-SEED-DEMO-/ },
  });
  const demoBookingIds = (
    await d
      .collection("bookings")
      .find({ bookingNumber: { $regex: /^BK-SEED-DEMO-/ } }, { projection: { conversationId: 1 } })
      .toArray()
  )
    .map((b) => b.conversationId)
    .filter(Boolean);
  const demoMessages =
    demoBookingIds.length === 0
      ? 0
      : await d.collection("messages").countDocuments({ conversationId: { $in: demoBookingIds } });
  console.log("demo bookings:", demoBookings, "| demo chat messages:", demoMessages);
  const svc = await d.collection("services").findOne({ price: { $ne: null } });
  console.log("sample service:", svc?.title, "|", svc?.pricingModel, svc?.price, svc?.currency);
  const prof = await d.collection("providerprofiles").findOne({});
  console.log("provider:", prof?.displayName, "|", prof?.location?.country, "/", prof?.location?.city);
  const cities = await d.collection("providerprofiles").distinct("location.city");
  console.log("cities:", cities.join(", "));
  const currencies = await d.collection("services").distinct("currency");
  console.log("currencies:", currencies.join(", "));
  await c.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});