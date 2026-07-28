import { db } from "./src";
import { parcelsTable } from "./src/schema/parcels";

async function main() {
  await db.delete(parcelsTable);
  console.log("Cleared parcels");
  process.exit(0);
}
main();
