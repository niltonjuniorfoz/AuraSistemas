import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const configuredMax = Number(process.env.DB_POOL_MAX || (process.env.VERCEL ? 1 : 10));
const maxConnections = Number.isFinite(configuredMax) && configuredMax > 0 ? Math.floor(configuredMax) : 1;

const client = postgres(connectionString, {
  prepare: false,
  max: maxConnections,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const sqlClient = client;
export const db = drizzle(client, { schema });
