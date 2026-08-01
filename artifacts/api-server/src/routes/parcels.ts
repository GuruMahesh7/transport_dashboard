import { Router } from "express";
import { db, parcelsTable, hubsTable, staffTable, itemsTable, parcelItemsTable } from "@workspace/db";
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
  const [dst] = await db.select({ hubName: hubsTable.hubName, hubCode: hubsTable.hubCode, parentHubId: hubsTable.parentHubId }).from(hubsTable).where(eq(hubsTable.id, p.destinationHubId)).limit(1);
  let destinationHubType = "Main Branch";
  let destinationParentHubName = null;
  if (dst?.parentHubId) {
    destinationHubType = "Sub Branch";
    const [parent] = await db.select({ hubName: hubsTable.hubName }).from(hubsTable).where(eq(hubsTable.id, dst.parentHubId)).limit(1);
    destinationParentHubName = parent?.hubName ?? null;
  }

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
  
  // Fetch parcel items
  const pItems = await db
    .select({
      id: parcelItemsTable.id,
      itemId: parcelItemsTable.itemId,
      itemName: itemsTable.name,
      numBoxes: parcelItemsTable.numBoxes,
      weightKg: parcelItemsTable.weightKg,
      charges: parcelItemsTable.charges,
      remarks: parcelItemsTable.remarks,
    })
    .from(parcelItemsTable)
    .leftJoin(itemsTable, eq(parcelItemsTable.itemId, itemsTable.id))
    .where(eq(parcelItemsTable.parcelId, p.id));

  return {
    ...p,
    weightKg: parseFloat(p.weightKg),
    charges: parseFloat(p.charges),
    handlingFee: parseFloat(p.handlingFee || '0'),
    totalAmount: parseFloat(p.totalAmount || '0'),
    destinationHubName: dst?.hubName ?? null,
    destinationHubCode: dst?.hubCode ?? null,
    destinationHubType,
    destinationParentHubName,
    itemName,
    bookedByName,
    items: pItems.map(pi => ({
      ...pi,
      weightKg: parseFloat(pi.weightKg as string),
      charges: parseFloat(pi.charges as string)
    })),
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
  const { senderName, senderPhone, senderEmail, senderAddress, handlingFee, paymentType, destinationHubId } = req.body;
  
  // If we receive an array of items (new format)
  const incomingItems = req.body.items && Array.isArray(req.body.items) ? req.body.items : [{
    itemId: req.body.itemId,
    numBoxes: req.body.numBoxes,
    weightKg: req.body.weightKg,
    charges: req.body.charges,
    remarks: req.body.remarks
  }];

  // Calculate totals
  const totalBoxes = incomingItems.reduce((acc: any, curr: any) => acc + (Number(curr.numBoxes) || 0), 0);
  const totalWeight = incomingItems.reduce((acc: any, curr: any) => acc + (Number(curr.weightKg) || 0), 0);
  const totalCharges = incomingItems.reduce((acc: any, curr: any) => acc + (Number(curr.charges) || 0), 0);
  const parsedHandlingFee = Number(handlingFee) || 0;
  const totalAmount = totalCharges + parsedHandlingFee;
  
  const awbNumber = await generateAwbNumber();
  const [parcel] = await db.insert(parcelsTable).values({
    awbNumber, senderName, senderPhone, senderEmail: senderEmail || null, senderAddress,
    numBoxes: totalBoxes, 
    weightKg: String(totalWeight), 
    charges: String(totalCharges), 
    handlingFee: String(parsedHandlingFee), 
    totalAmount: String(totalAmount), 
    paymentType: paymentType || 'To-Pay', 
    destinationHubId, 
    currentStatus: "RECEIVED_AT_ORIGIN", 
    bookedBy: staff.id,
  }).returning();

  if (incomingItems.length > 0) {
    const itemsToInsert = incomingItems.map((item: any) => ({
      parcelId: parcel.id,
      itemId: item.itemId,
      numBoxes: Number(item.numBoxes),
      weightKg: String(item.weightKg),
      charges: String(item.charges),
      remarks: item.remarks || null
    }));
    await db.insert(parcelItemsTable).values(itemsToInsert);
  }

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
  const allowed = ["senderName", "senderPhone", "senderEmail", "senderAddress", "numBoxes", "weightKg", "itemId", "charges", "handlingFee", "totalAmount", "paymentType", "remarks"];
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
