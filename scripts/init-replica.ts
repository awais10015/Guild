/**
 * Idempotently initiates the single-node replica set "rs0" so that
 * multi-document transactions are available on local MongoDB.
 * Safe to run any number of times.
 */
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/?directConnection=true";

async function main() {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    await client.db("admin").command({
      replSetInitiate: { _id: "rs0", members: [{ _id: 0, host: "127.0.0.1:27017" }] },
    });
    console.log("[init-replica] replica set rs0 initiated");
  } catch (err: any) {
    if (String(err?.codeName || err?.message).includes("AlreadyInitialized")) {
      console.log("[init-replica] replica set already initialized");
    } else {
      console.error("[init-replica] error:", err?.message || err);
      process.exitCode = 1;
    }
  } finally {
    await client.close();
  }
}

main();
