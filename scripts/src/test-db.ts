import { db, parcelsTable } from "@workspace/db";

async function main() {
  console.log("Querying parcels...");
  const parcels = await db.select().from(parcelsTable);
  console.log("Parcels in database:", JSON.stringify(parcels, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
