import { createHash } from "crypto";
import { db } from "@workspace/db";
import { hubsTable, staffTable, parcelsTable, complaintsTable, auditLogsTable, itemsTable } from "@workspace/db";

function hashPassword(password: string): string {
  const secret = process.env.SESSION_SECRET || "tms-secret";
  return createHash("sha256").update(password + secret).digest("hex");
}

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data

  await db.delete(auditLogsTable);
  await db.delete(complaintsTable);
  await db.delete(parcelsTable);
  await db.delete(itemsTable);
  await db.delete(staffTable);
  await db.delete(hubsTable);

  // 3 Destination hubs
  const hubData = [
    { hubName: "Hyderabad Destination", hubCode: "HYD", address: "Abids, Hyderabad", contactNumber: "9000000001" },
    { hubName: "Warangal Destination", hubCode: "WGL", address: "Hanamkonda, Warangal", contactNumber: "9000000002" },
    { hubName: "Karimnagar Destination", hubCode: "KMR", address: "Karimnagar", contactNumber: "9000000003" },
  ];

  const hubs = await db.insert(hubsTable).values(hubData).returning();
  console.log(`✅ Created ${hubs.length} destination hubs`);

  // Staff: central users
  const staffData = [
    { name: "Super Admin", phone: "9100000000", email: "admin@tms.com", passwordHash: hashPassword("Admin@123"), role: "SUPER_ADMIN" },
    { name: "Staff User", phone: "9100000001", email: "staff@tms.com", passwordHash: hashPassword("Staff@123"), role: "HUB_STAFF" }
  ];

  const staff = await db.insert(staffTable).values(staffData).returning();
  console.log(`✅ Created ${staff.length} central staff members`);

  // Items
  const itemsData = [
    { name: "General Goods", defaultPrice: "100" },
    { name: "Fragile", defaultPrice: "200" }
  ];
  const items = await db.insert(itemsTable).values(itemsData).returning();
  console.log(`✅ Created ${items.length} items`);

  // Create some parcels
  const parcelData = Array.from({ length: 5 }).map((_, i) => {
    return {
      awbNumber: `HB2026072700${i+1}`,
      senderName: `Sender ${i+1}`,
      senderPhone: `920000000${i}`,
      senderAddress: `Sender Address ${i+1}`,
      receiverName: `Receiver ${i+1}`,
      receiverPhone: `930000000${i}`,
      receiverAddress: `Receiver Address ${i+1}`,
      numBoxes: 1,
      weightKg: "5.5",
      parcelType: "GENERAL",
      charges: "500",
      handlingFee: "50",
      totalAmount: "550",
      paymentType: i % 2 === 0 ? "To-Pay" : "Paid",
      destinationHubId: hubs[i % hubs.length].id,
      itemId: items[0].id,
      currentStatus: "BOOKED",
      bookedBy: staff[1].id
    };
  });

  const parcels = await db.insert(parcelsTable).values(parcelData).returning();
  console.log(`✅ Created ${parcels.length} parcels`);

  console.log("\n🎉 Seed complete!");
  console.log("📧 Login: admin@tms.com / Admin@123");
  console.log("📧 Staff: staff@tms.com / Staff@123");
  process.exit(0);
}

main().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
