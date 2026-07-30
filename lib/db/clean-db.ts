import { db, hubsTable, parcelsTable, parcelItemsTable, parcelStatusHistoryTable, itemsTable } from "./src/index.ts";
import { eq, inArray, isNotNull, isNull } from "drizzle-orm";

async function main() {
  console.log("Starting DB cleanup...");

  // 1. Remove all old parcels data till now
  try { await db.delete(parcelStatusHistoryTable); console.log("Deleted parcel status history."); } catch (e) { console.log("Failed to delete parcel status history (maybe table does not exist)"); }
  try { await db.delete(parcelItemsTable); console.log("Deleted parcel items."); } catch (e) { console.log("Failed to delete parcel items"); }
  try { await db.delete(parcelsTable); console.log("Deleted parcels."); } catch (e) { console.log("Failed to delete parcels"); }

  // 2. Remove all item types data
  try { await db.delete(itemsTable); console.log("Deleted item types."); } catch (e) { console.log("Failed to delete item types"); }

  // 3. Remove all subbranches till now
  try { await db.delete(hubsTable).where(isNotNull(hubsTable.parentHubId)); console.log("Deleted sub branches."); } catch (e) { console.log("Failed to delete sub branches"); }

  // 4. Check main branches
  const mainHubs = await db.select().from(hubsTable).where(isNull(hubsTable.parentHubId));
  console.log("Main hubs:", mainHubs.map(h => ({ id: h.id, name: h.hubName })));

  // Rename "bhongir" and "mothkur" as one... wait, if there are two, the user said "remane the two main branches to one as bhongir and mothkur as one". This implies they should be named "Bhongir" and "Mothkur" respectively. Let me just rename them exactly to what the user wants if needed, or if the user meant rename them to "bhongir" and "mothkur" if they had different names. Wait, "remane the two main branches to one as bhongir and mothkur as one". Maybe they want to keep "bhongir" and "mothkur" as two main branches? "remane the two main branches to one as bhongir and mothkur as one". No, "rename the two main branches to one as bhongir and mothkur as one" - probably means they currently have two main branches, and they want them to be named "Bhongir" and "Mothkur".
  
  if (mainHubs.length >= 2) {
     const [h1, h2] = mainHubs;
     await db.update(hubsTable).set({ hubName: "Bhongir", hubCode: "BHO" }).where(eq(hubsTable.id, h1.id));
     await db.update(hubsTable).set({ hubName: "Mothkur", hubCode: "MTK" }).where(eq(hubsTable.id, h2.id));
     console.log("Renamed main hubs to Bhongir and Mothkur.");
  } else if (mainHubs.length === 1) {
     await db.update(hubsTable).set({ hubName: "Bhongir & Mothkur", hubCode: "BHO-MTK" }).where(eq(hubsTable.id, mainHubs[0].id));
  } else {
     await db.insert(hubsTable).values([
       { hubName: "Bhongir", hubCode: "BHO", address: "", contactNumber: "" },
       { hubName: "Mothkur", hubCode: "MTK", address: "", contactNumber: "" }
     ]);
     console.log("Created Bhongir and Mothkur hubs.");
  }

  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
