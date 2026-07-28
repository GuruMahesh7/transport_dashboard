import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

// Load .env automatically if DATABASE_URL is not set
if (!process.env.DATABASE_URL) {
  try {
    const possiblePaths = [
      path.resolve(process.cwd(), ".env"),
      path.resolve(process.cwd(), "../../.env"),
      path.resolve(process.cwd(), "../.env"),
      path.resolve(import.meta.dirname, "../../../.env"),
      path.resolve(import.meta.dirname, "../../.env")
    ];
    let envPath = "";
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        envPath = p;
        break;
      }
    }
    if (envPath) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      for (const line of envContent.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const [key, ...values] = trimmed.split("=");
          const value = values.join("=");
          if (key && value) {
            process.env[key.trim()] = value.trim().replace(/^['"]|['"]$/g, "");
          }
        }
      }
    }
  } catch (err) {
    console.warn("Failed to load .env file:", err);
  }
}

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export * from "./schema";
