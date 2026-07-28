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

  console.log("Seeding data...");

  try {
    // Hubs
    const hubs = [
      { hub_name: "Hyderabad Hub", hub_code: "HYD01", address: "Kishan Gunj, Hyd", contact_number: "9886193455", is_active: true },
      { hub_name: "Siddipet Hub", hub_code: "SDP01", address: "Near Kaman, Siddipet", contact_number: "9490200408", is_active: true },
      { hub_name: "Karimnagar Hub", hub_code: "KRN01", address: "Main Road, Karimnagar", contact_number: "9000000000", is_active: true }
    ];

    for (const h of hubs) {
      await sql`INSERT INTO "hubs" ("hub_name", "hub_code", "address", "contact_number", "is_active") VALUES (${h.hub_name}, ${h.hub_code}, ${h.address}, ${h.contact_number}, ${h.is_active}) ON CONFLICT ("hub_code") DO NOTHING;`;
    }

    // Items
    const itemsData = [
      { name: "General Box", default_price: 150 },
      { name: "Documents", default_price: 50 },
      { name: "Fragile", default_price: 250 },
      { name: "Electronics", default_price: 500 }
    ];

    for (const i of itemsData) {
      await sql`INSERT INTO "items" ("name", "default_price") VALUES (${i.name}, ${i.default_price}) ON CONFLICT ("name") DO NOTHING;`;
    }
    const items = await sql`SELECT id FROM "items" LIMIT 1;`;
    const defaultItemId = items[0]?.id || 1;

    // Admin & Staff
    const adminPass = await hashPassword("Admin@123");
    const staffPass = await hashPassword("Staff@123");

    await sql`INSERT INTO "staff" ("name", "email", "phone", "password_hash", "role", "is_active") VALUES ('Admin User', 'admin@tms.com', '9999999999', ${adminPass}, 'SUPER_ADMIN', true) ON CONFLICT ("email") DO UPDATE SET "password_hash" = ${adminPass}, "role" = 'SUPER_ADMIN';`;
    await sql`INSERT INTO "staff" ("name", "email", "phone", "password_hash", "role", "is_active") VALUES ('Staff User', 'staff@tms.com', '8888888888', ${staffPass}, 'HUB_STAFF', true) ON CONFLICT ("email") DO UPDATE SET "password_hash" = ${staffPass}, "role" = 'HUB_STAFF';`;
    
    const staff = await sql`SELECT id FROM "staff" WHERE email = 'staff@tms.com' LIMIT 1;`;
    const staffId = staff[0]?.id || 1;
    const destHubs = await sql`SELECT id FROM "hubs" LIMIT 3;`;
    
    // Create test parcels
    for(let i = 0; i < 5; i++) {
        const destHubId = destHubs[i % destHubs.length]?.id || 1;
        await sql`
            INSERT INTO "parcels" (
                "awb_number", "sender_name", "sender_phone", "sender_address", 
                "receiver_name", "receiver_phone", "receiver_address",
                "num_boxes", "weight_kg", "item_id", "charges", "handling_fee", "total_amount", "payment_type",
                "destination_hub_id", "current_status", "booked_by"
            ) VALUES (
                ${'AWB2026TEST0' + (i+1)}, ${'Sender ' + (i+1)}, ${'900000000' + i}, ${'Sender Address ' + i},
                ${'Receiver ' + (i+1)}, ${'910000000' + i}, ${'Receiver Address ' + i},
                1, '5.5', ${defaultItemId}, '500', '50', '550', ${i % 2 === 0 ? 'To-Pay' : 'Paid'},
                ${destHubId}, 'BOOKED', ${staffId}
            ) ON CONFLICT ("awb_number") DO NOTHING;
        `;
    }

    console.log("Seeded successfully.");
  } catch (error) {
    console.error("Error seeding:", error);
  }

  console.log("Done.");
  process.exit(0);
}

main();
