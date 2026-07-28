import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

async function main() {
  const connectionString = "postgresql://neondb_owner:npg_Yx9n3idGkqhK@ep-tiny-truth-ayqh8pnf-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";
  const sql = postgres(connectionString);
  const db = drizzle(sql);

  console.log("Running migrations...");

  try {
    await sql`ALTER TABLE "staff" DROP COLUMN IF EXISTS "hub_id";`;
    await sql`ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "hub_id";`;
    await sql`ALTER TABLE "parcels" DROP COLUMN IF EXISTS "source_hub_id";`;
    await sql`ALTER TABLE "parcels" DROP COLUMN IF EXISTS "parcel_type";`;
    await sql`DROP TABLE IF EXISTS "parcel_status_history" CASCADE;`;
    console.log("Dropped old columns successfully.");
  } catch (error) {
    console.error("Error dropping columns:", error);
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS "items" (
        "id" serial PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "default_price" numeric(10, 2) NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "items_name_unique" UNIQUE("name")
      );
    `;
    
    await sql`ALTER TABLE "parcels" ADD COLUMN IF NOT EXISTS "item_id" integer;`;
    
    try {
      await sql`ALTER TABLE "parcels" ADD CONSTRAINT "parcels_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;`;
    } catch(e: any) {
      // constraint might already exist
    }

    console.log("Added new columns and tables successfully.");
  } catch (error) {
    console.error("Error adding new columns:", error);
  }

  console.log("Done.");
  process.exit(0);
}

main();
