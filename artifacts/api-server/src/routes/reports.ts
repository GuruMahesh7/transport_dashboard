import { Router } from "express";
import { db, parcelsTable, hubsTable, complaintsTable } from "@workspace/db";
import { eq, and, gte, lte, sql, or } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

router.get("/reports/daily", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  const { date } = req.query;
  const d = date ? new Date(date as string) : new Date();
  const start = new Date(d); start.setHours(0, 0, 0, 0);
  const end = new Date(d); end.setHours(23, 59, 59, 999);

  const dateWhere = and(gte(parcelsTable.createdAt, start), lte(parcelsTable.createdAt, end));

  const [booked] = await db.select({ count: sql<number>`count(*)` }).from(parcelsTable).where(dateWhere);
  const [delivered] = await db.select({ count: sql<number>`count(*)` }).from(parcelsTable).where(and(dateWhere, eq(parcelsTable.currentStatus, "DELIVERED")));
  const [pending] = await db.select({ count: sql<number>`count(*)` }).from(parcelsTable)
    .where(or(eq(parcelsTable.currentStatus, "BOOKED"), eq(parcelsTable.currentStatus, "RECEIVED_AT_ORIGIN"), eq(parcelsTable.currentStatus, "DISPATCHED"), eq(parcelsTable.currentStatus, "RECEIVED_AT_DESTINATION"), eq(parcelsTable.currentStatus, "READY_FOR_PICKUP"))!);
  const [rev] = await db.select({ total: sql<number>`coalesce(sum(charges::numeric), 0)` }).from(parcelsTable).where(dateWhere);

  res.json({ date: d.toISOString().split("T")[0], totalBooked: Number(booked.count), totalDelivered: Number(delivered.count), totalPending: Number(pending.count), revenueToday: Number(rev.total) });
});

router.get("/reports/hub-wise", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const start = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 86400000);
  const end = dateTo ? new Date(dateTo as string) : new Date();
  end.setHours(23, 59, 59, 999);

  const hubs = await db.select().from(hubsTable).orderBy(hubsTable.hubName);
  const result = await Promise.all(hubs.map(async hub => {
    const dateWhere = and(gte(parcelsTable.createdAt, start), lte(parcelsTable.createdAt, end));
    const hubWhere = eq(parcelsTable.destinationHubId, hub.id);
    const [bookings] = await db.select({ count: sql<number>`count(*)` }).from(parcelsTable).where(and(dateWhere, hubWhere));
    const [deliveries] = await db.select({ count: sql<number>`count(*)` }).from(parcelsTable).where(and(dateWhere, hubWhere, eq(parcelsTable.currentStatus, "DELIVERED")));
    const [pending] = await db.select({ count: sql<number>`count(*)` }).from(parcelsTable)
      .where(and(hubWhere, or(eq(parcelsTable.currentStatus, "BOOKED"), eq(parcelsTable.currentStatus, "RECEIVED_AT_ORIGIN"), eq(parcelsTable.currentStatus, "DISPATCHED"), eq(parcelsTable.currentStatus, "READY_FOR_PICKUP"))!));
    const [rev] = await db.select({ total: sql<number>`coalesce(sum(charges::numeric), 0)` }).from(parcelsTable).where(and(dateWhere, hubWhere));
    const [comps] = await db.select({ count: sql<number>`count(*)` })
      .from(complaintsTable)
      .innerJoin(parcelsTable, eq(complaintsTable.parcelId, parcelsTable.id))
      .where(and(
        or(eq(complaintsTable.status, "RAISED"), eq(complaintsTable.status, "INVESTIGATING"))!,
        eq(parcelsTable.destinationHubId, hub.id)
      ));
      
    let parentHubName = null;
    if (hub.parentHubId) {
      const parentHub = hubs.find(h => h.id === hub.parentHubId);
      if (parentHub) {
        parentHubName = parentHub.hubName;
      }
    }

    return { 
      hubId: hub.id, 
      hubName: hub.hubName, 
      hubCode: hub.hubCode, 
      type: hub.parentHubId ? "Sub Branch" : "Main Branch",
      parentHubName,
      bookings: Number(bookings.count), 
      deliveries: Number(deliveries.count), 
      pending: Number(pending.count), 
      revenue: Number(rev.total), 
      complaints: Number(comps.count) 
    };
  }));
  res.json(result);
});

router.get("/reports/monthly", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  const { months = "6" } = req.query;
  const monthCount = parseInt(months as string);
  const result = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getFullYear() === d.getFullYear() ? d.getMonth() + 1 : d.getMonth() + 1, 0, 23, 59, 59, 999);
    const [total] = await db.select({ count: sql<number>`count(*)` }).from(parcelsTable).where(and(gte(parcelsTable.createdAt, start), lte(parcelsTable.createdAt, end)));
    const [delivered] = await db.select({ count: sql<number>`count(*)` }).from(parcelsTable).where(and(gte(parcelsTable.createdAt, start), lte(parcelsTable.createdAt, end), eq(parcelsTable.currentStatus, "DELIVERED")));
    const [complaints] = await db.select({ count: sql<number>`count(*)` }).from(complaintsTable).where(and(gte(complaintsTable.createdAt, start), lte(complaintsTable.createdAt, end)));
    const [rev] = await db.select({ total: sql<number>`coalesce(sum(charges::numeric), 0)` }).from(parcelsTable).where(and(gte(parcelsTable.createdAt, start), lte(parcelsTable.createdAt, end)));
    const totalCount = Number(total.count);
    const deliveredCount = Number(delivered.count);
    const complaintCount = Number(complaints.count);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    result.push({ month: d.getMonth() + 1, year: d.getFullYear(), label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`, totalParcels: totalCount, delivered: deliveredCount, deliveryPercentage: totalCount > 0 ? Math.round((deliveredCount / totalCount) * 100) : 0, complaintRate: totalCount > 0 ? Math.round((complaintCount / totalCount) * 100) : 0, revenue: Number(rev.total) });
  }
  res.json(result);
});

router.get("/reports/export", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  res.json({ url: `/api/reports/daily?format=csv` });
});

export default router;
