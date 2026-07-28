import { Router } from "express";
import { db, parcelsTable, hubsTable, complaintsTable } from "@workspace/db";
import { eq, and, gte, lte, sql, or, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

function todayRange() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  return { start, end };
}

router.get("/dashboard/stats", requireAuth, async (req, res) => {
  const { start, end } = todayRange();
  const dateFilter = and(gte(parcelsTable.createdAt, start), lte(parcelsTable.createdAt, end));

  const [todayBooked] = await db.select({ count: sql<number>`count(*)` }).from(parcelsTable)
    .where(dateFilter);

  const [incoming] = await db.select({ count: sql<number>`count(*)` }).from(parcelsTable)
    .where(or(eq(parcelsTable.currentStatus, "DISPATCHED"), eq(parcelsTable.currentStatus, "RECEIVED_AT_DESTINATION"))!);

  const [outgoing] = await db.select({ count: sql<number>`count(*)` }).from(parcelsTable)
    .where(and(eq(parcelsTable.currentStatus, "DISPATCHED"), dateFilter));

  const [ready] = await db.select({ count: sql<number>`count(*)` }).from(parcelsTable)
    .where(eq(parcelsTable.currentStatus, "READY_FOR_PICKUP"));

  const [delivered] = await db.select({ count: sql<number>`count(*)` }).from(parcelsTable)
    .where(and(eq(parcelsTable.currentStatus, "DELIVERED"), dateFilter));

  let openComplaintsQuery = db.select({ count: sql<number>`count(*)` })
    .from(complaintsTable)
    .innerJoin(parcelsTable, eq(complaintsTable.parcelId, parcelsTable.id));

  let openComplaintsWhere = or(eq(complaintsTable.status, "RAISED"), eq(complaintsTable.status, "INVESTIGATING"))!;
  const [openComplaints] = await openComplaintsQuery.where(openComplaintsWhere);

  res.json({
    todayBookings: Number(todayBooked.count),
    incomingParcels: Number(incoming.count),
    outgoingParcels: Number(outgoing.count),
    readyForPickup: Number(ready.count),
    deliveredToday: Number(delivered.count),
    openComplaints: Number(openComplaints.count),
  });
});

router.get("/dashboard/recent-parcels", requireAuth, async (req, res) => {
  const { limit: limitStr = "10" } = req.query;
  const limitNum = parseInt(limitStr as string);

  const rows = await db.select().from(parcelsTable).orderBy(desc(parcelsTable.createdAt)).limit(limitNum);

  const enriched = await Promise.all(rows.map(async p => {
    const [dst] = await db.select({ hubName: hubsTable.hubName, hubCode: hubsTable.hubCode }).from(hubsTable).where(eq(hubsTable.id, p.destinationHubId)).limit(1);
    return { ...p, weightKg: parseFloat(p.weightKg), charges: parseFloat(p.charges), destinationHubName: dst?.hubName ?? null, destinationHubCode: dst?.hubCode ?? null, bookedByName: null, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() };
  }));
  res.json(enriched);
});

router.get("/dashboard/hub-breakdown", requireAuth, async (req, res) => {
  const hubs = await db.select().from(hubsTable).orderBy(hubsTable.hubName);
  const { start, end } = todayRange();

  const breakdown = await Promise.all(hubs.map(async hub => {
    const [todayBooked] = await db.select({ count: sql<number>`count(*)` }).from(parcelsTable)
      .where(and(eq(parcelsTable.destinationHubId, hub.id), gte(parcelsTable.createdAt, start), lte(parcelsTable.createdAt, end)));
    const [inTransit] = await db.select({ count: sql<number>`count(*)` }).from(parcelsTable)
      .where(and(eq(parcelsTable.destinationHubId, hub.id), eq(parcelsTable.currentStatus, "DISPATCHED")));
    const [delivered] = await db.select({ count: sql<number>`count(*)` }).from(parcelsTable)
      .where(and(eq(parcelsTable.destinationHubId, hub.id), eq(parcelsTable.currentStatus, "DELIVERED")));
    const [pending] = await db.select({ count: sql<number>`count(*)` }).from(parcelsTable)
      .where(and(eq(parcelsTable.destinationHubId, hub.id), or(eq(parcelsTable.currentStatus, "BOOKED"), eq(parcelsTable.currentStatus, "RECEIVED_AT_ORIGIN"), eq(parcelsTable.currentStatus, "READY_FOR_PICKUP"))!));
    const [complaints] = await db.select({ count: sql<number>`count(*)` })
      .from(complaintsTable)
      .innerJoin(parcelsTable, eq(complaintsTable.parcelId, parcelsTable.id))
      .where(and(
        or(eq(complaintsTable.status, "RAISED"), eq(complaintsTable.status, "INVESTIGATING"))!,
        eq(parcelsTable.destinationHubId, hub.id)
      ));
    return { hubId: hub.id, hubName: hub.hubName, hubCode: hub.hubCode, todayBookings: Number(todayBooked.count), inTransit: Number(inTransit.count), delivered: Number(delivered.count), pending: Number(pending.count), complaints: Number(complaints.count) };
  }));
  res.json(breakdown);
});

export default router;
