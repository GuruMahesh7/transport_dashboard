import { Router } from "express";
import { db, parcelsTable, hubsTable, staffTable, itemsTable } from "@workspace/db";
import { eq, and, gte, lte, desc, sql, or, ilike } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { generateAwbNumber } from "../lib/awb";
import { createAuditLog } from "../lib/audit";
import { sendParcelEmailNotification } from "../lib/email";

const router = Router();

function parcelBase() {
  return db
    .select({
      id: parcelsTable.id,
      awbNumber: parcelsTable.awbNumber,
      senderName: parcelsTable.senderName,
      senderPhone: parcelsTable.senderPhone,
      senderAddress: parcelsTable.senderAddress,
      receiverName: parcelsTable.receiverName,
      receiverPhone: parcelsTable.receiverPhone,
      receiverAddress: parcelsTable.receiverAddress,
      numBoxes: parcelsTable.numBoxes,
      weightKg: parcelsTable.weightKg,
      itemId: parcelsTable.itemId,
      charges: parcelsTable.charges,
      handlingFee: parcelsTable.handlingFee,
      totalAmount: parcelsTable.totalAmount,
      paymentType: parcelsTable.paymentType,
      remarks: parcelsTable.remarks,
      destinationHubId: parcelsTable.destinationHubId,
      currentStatus: parcelsTable.currentStatus,
      bookedBy: parcelsTable.bookedBy,
      createdAt: parcelsTable.createdAt,
      updatedAt: parcelsTable.updatedAt,
    })
    .from(parcelsTable);
}

async function enrichParcel(p: any) {
  const [dst] = await db.select({ hubName: hubsTable.hubName, hubCode: hubsTable.hubCode }).from(hubsTable).where(eq(hubsTable.id, p.destinationHubId)).limit(1);
  let bookedByName = null;
  if (p.bookedBy) {
    const [bk] = await db.select({ name: staffTable.name }).from(staffTable).where(eq(staffTable.id, p.bookedBy)).limit(1);
    bookedByName = bk?.name ?? null;
  }
  let itemName = null;
  if (p.itemId) {
    const [itm] = await db.select({ name: itemsTable.name }).from(itemsTable).where(eq(itemsTable.id, p.itemId)).limit(1);
    itemName = itm?.name ?? null;
  }
  return {
    ...p,
    weightKg: parseFloat(p.weightKg),
    charges: parseFloat(p.charges),
    handlingFee: parseFloat(p.handlingFee || '0'),
    totalAmount: parseFloat(p.totalAmount || '0'),
    destinationHubName: dst?.hubName ?? null,
    destinationHubCode: dst?.hubCode ?? null,
    itemName,
    bookedByName,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

router.get("/parcels", requireAuth, async (req, res) => {
  const { status, hubId, page = "1", limit: limitStr = "20", dateFrom, dateTo } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limitStr as string);
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [];
  if (status) conditions.push(eq(parcelsTable.currentStatus, status as string));
  if (hubId) conditions.push(eq(parcelsTable.destinationHubId, parseInt(hubId as string)));
  if (dateFrom) conditions.push(gte(parcelsTable.createdAt, new Date(dateFrom as string)));
  if (dateTo) {
    const d = new Date(dateTo as string);
    d.setHours(23, 59, 59, 999);
    conditions.push(lte(parcelsTable.createdAt, d));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(parcelsTable).where(where);
  const rows = await db.select().from(parcelsTable).where(where).orderBy(desc(parcelsTable.createdAt)).limit(limitNum).offset(offset);
  const parcels = await Promise.all(rows.map(enrichParcel));
  res.json({ parcels, total: Number(count), page: pageNum, limit: limitNum });
});

router.post("/parcels", requireAuth, async (req, res) => {
  const staff = (req as any).staff;
  const { senderName, senderPhone, senderEmail, senderAddress, receiverName, receiverPhone, receiverEmail, receiverAddress, numBoxes, weightKg, itemId, charges, handlingFee, totalAmount, paymentType, remarks, destinationHubId } = req.body;
  const awbNumber = await generateAwbNumber();
  const [parcel] = await db.insert(parcelsTable).values({
    awbNumber, senderName, senderPhone, senderEmail: senderEmail || null, senderAddress, receiverName, receiverPhone, receiverEmail: receiverEmail || null, receiverAddress,
    numBoxes, weightKg: String(weightKg), itemId, charges: String(charges), handlingFee: String(handlingFee || 0), totalAmount: String(totalAmount || charges), paymentType: paymentType || 'To-Pay', remarks: remarks || null,
    destinationHubId, currentStatus: "RECEIVED_AT_ORIGIN", bookedBy: staff.id,
  }).returning();


  await createAuditLog({ action: "CREATE", entityType: "parcel", entityId: parcel.id, newValue: { awbNumber, currentStatus: "RECEIVED_AT_ORIGIN" }, performedBy: staff.id, description: `Booked parcel ${awbNumber}` });

  sendParcelEmailNotification(parcel, "RECEIVED_AT_ORIGIN").catch(err => {
    console.error("Failed to send booking email notification:", err);
  });

  res.status(201).json(await enrichParcel(parcel));
});

router.get("/parcels/awb/:awbNumber", requireAuth, async (req, res) => {
  const [parcel] = await db.select().from(parcelsTable).where(eq(parcelsTable.awbNumber, req.params.awbNumber as string)).limit(1);
  if (!parcel) { res.status(404).json({ error: "Parcel not found" }); return; }
  const enriched = await enrichParcel(parcel);
  res.json({ ...enriched });
});

router.get("/parcels/:parcelId", requireAuth, async (req, res) => {
  const parcelId = parseInt(req.params.parcelId as string);
  const [parcel] = await db.select().from(parcelsTable).where(eq(parcelsTable.id, parcelId)).limit(1);
  if (!parcel) { res.status(404).json({ error: "Parcel not found" }); return; }
  const enriched = await enrichParcel(parcel);
  res.json({ ...enriched });
});

router.patch("/parcels/:parcelId", requireAuth, async (req, res) => {
  const parcelId = parseInt(req.params.parcelId as string);
  const allowed = ["senderName", "senderPhone", "senderEmail", "senderAddress", "receiverName", "receiverPhone", "receiverEmail", "receiverAddress", "numBoxes", "weightKg", "itemId", "charges", "handlingFee", "totalAmount", "paymentType", "remarks"];
  const updates: any = {};
  for (const k of allowed) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }
  if (updates.weightKg) updates.weightKg = String(updates.weightKg);
  if (updates.charges) updates.charges = String(updates.charges);
  if (updates.handlingFee) updates.handlingFee = String(updates.handlingFee);
  if (updates.totalAmount) updates.totalAmount = String(updates.totalAmount);
  await db.update(parcelsTable).set(updates).where(eq(parcelsTable.id, parcelId));
  const [parcel] = await db.select().from(parcelsTable).where(eq(parcelsTable.id, parcelId)).limit(1);
  if (!parcel) { res.status(404).json({ error: "Parcel not found" }); return; }
  res.json(await enrichParcel(parcel));
});



export default router;
