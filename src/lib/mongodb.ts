import { MongoClient, Db } from "mongodb";

/**
 * Server-only MongoDB connection manager for K2WFINANCE.
 *
 * Implements bounded timeouts, client promise caching across hot lambdas,
 * failure recovery (clearing cached promise on error so subsequent requests can retry),
 * and required unique index verification.
 */

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || "k2wfinance_preview";

if (!uri && process.env.NODE_ENV === "production") {
  console.warn("MONGODB_URI environment variable is missing in production.");
}

interface MongoCache {
  client: MongoClient | null;
  promise: Promise<MongoClient> | null;
  indexesEnsured: boolean;
}

declare global {
  var _k2wMongoCache: MongoCache | undefined;
}

const cache: MongoCache = global._k2wMongoCache || {
  client: null,
  promise: null,
  indexesEnsured: false,
};

if (process.env.NODE_ENV !== "production") {
  global._k2wMongoCache = cache;
}

/**
 * Connects to MongoDB with bounded connection and server selection timeouts.
 * Clears cached promise on failure so retries can reconnect cleanly.
 */
export async function getMongoClient(): Promise<MongoClient> {
  const currentUri = process.env.MONGODB_URI;
  if (!currentUri) {
    throw new Error("MONGODB_URI environment variable is not defined");
  }

  if (cache.client) {
    return cache.client;
  }

  if (!cache.promise) {
    const client = new MongoClient(currentUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 1,
    });

    cache.promise = client
      .connect()
      .then((connectedClient) => {
        cache.client = connectedClient;
        return connectedClient;
      })
      .catch((err) => {
        // Clear cached promise on failure so next request can retry connecting
        cache.promise = null;
        cache.client = null;
        throw err;
      });
  }

  return cache.promise;
}

/**
 * Resolves the target database instance.
 */
export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClient();
  const currentDbName = process.env.MONGODB_DB_NAME || dbName;
  const db = client.db(currentDbName);

  if (!cache.indexesEnsured) {
    await ensureRequiredIndexes(db);
    cache.indexesEnsured = true;
  }

  return db;
}

/**
 * Ensures required unique indexes exist on collections before writes are accepted.
 */
export async function ensureRequiredIndexes(db: Db): Promise<void> {
  try {
    // 1. Phone index on leads (unique contact grouping key)
    await db.collection("leads").createIndex(
      { phone: 1 },
      { unique: true }
    );

    // 2. Idempotency key on enquiries (unique submission constraint)
    await db.collection("enquiries").createIndex(
      { idempotencyKey: 1 },
      { unique: true }
    );

    // 3. Lead ID lookup index on enquiries
    await db.collection("enquiries").createIndex(
      { leadId: 1, createdAt: -1 }
    );

    // 4. Enquiry ID on campaign_touchpoints (strictly 1 touchpoint per enquiry)
    await db.collection("campaign_touchpoints").createIndex(
      { enquiryId: 1 },
      { unique: true }
    );

    // 5. Lead ID lookup on campaign_touchpoints
    await db.collection("campaign_touchpoints").createIndex(
      { leadId: 1, createdAt: -1 }
    );

    // 6. Rate limits TTL index
    await db.collection("rate_limits").createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 }
    );
  } catch (err) {
    console.error("Failed to ensure MongoDB indexes:", err);
    throw new Error("Database index verification failed");
  }
}
