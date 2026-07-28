import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import crypto from "crypto";
import { promisify } from "util";

const scrypt = promisify(crypto.scrypt);

async function hashPassword(password: string) {
  const secret = process.env.SESSION_SECRET || "tms-secret";
  return crypto.createHash("sha256").update(password + secret).digest("hex");
}

async function main() {
  const connectionString = "postgresql://neondb_owner:npg_Yx9n3idGkqhK@ep-tiny-truth-ayqh8pnf-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";
  const sql = postgres(connectionString);
  const db = drizzle(sql);

  console.log("Cleaning database...");

  try {
    // Truncate tables
    try { await sql`TRUNCATE TABLE "audit_logs" CASCADE;`; } catch(e) {}
    try { await sql`TRUNCATE TABLE "parcel_status_history" CASCADE;`; } catch(e) {}
    try { await sql`TRUNCATE TABLE "parcels" CASCADE;`; } catch(e) {}
    try { await sql`TRUNCATE TABLE "complaints" CASCADE;`; } catch(e) {}
    try { await sql`TRUNCATE TABLE "items" CASCADE;`; } catch(e) {}
    try { await sql`TRUNCATE TABLE "staff" CASCADE;`; } catch(e) {}
    try { await sql`TRUNCATE TABLE "hubs" CASCADE;`; } catch(e) {}

    console.log("Seeding base data...");

    // Only one Hub
    const hubs = [
      { hub_name: "Siddipet Hub", hub_code: "SDP01", address: "Near Kaman, Siddipet", contact_number: "9490200408", is_active: true }
    ];

    for (const h of hubs) {
      await sql`INSERT INTO "hubs" ("hub_name", "hub_code", "address", "contact_number", "is_active") VALUES (${h.hub_name}, ${h.hub_code}, ${h.address}, ${h.contact_number}, ${h.is_active}) ON CONFLICT ("hub_code") DO NOTHING;`;
    }

    // Items (Keep standard items)
    const itemsData = [
      { name: "General Box", default_price: 150 },
      { name: "Documents", default_price: 50 },
      { name: "Fragile", default_price: 250 },
      { name: "Electronics", default_price: 500 }
    ];

    for (const i of itemsData) {
      await sql`INSERT INTO "items" ("name", "default_price") VALUES (${i.name}, ${i.default_price}) ON CONFLICT ("name") DO NOTHING;`;
    }

    // Admin Credentials
    const adminPass = await hashPassword("Admin@123");
    await sql`INSERT INTO "staff" ("name", "email", "phone", "password_hash", "role", "is_active") VALUES ('Admin User', 'admin@tms.com', '9999999999', ${adminPass}, 'SUPER_ADMIN', true) ON CONFLICT ("email") DO UPDATE SET "password_hash" = ${adminPass}, "role" = 'SUPER_ADMIN';`;

    console.log("Database reset and seeded successfully.");
  } catch (error) {
    console.error("Error resetting db:", error);
  }

  console.log("Done.");
  process.exit(0);
}

main();
