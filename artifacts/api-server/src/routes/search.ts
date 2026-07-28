import { Router } from "express";
import { db, parcelsTable, hubsTable } from "@workspace/db";
import { eq, or, ilike, and, gte, lte, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/search", requireAuth, async (req, res) => {
  const { q, phone, dateFrom, dateTo } = req.query;
  const conditions: any[] = [];

  if (q) {
    conditions.push(ilike(parcelsTable.awbNumber, `%${q}%`));
  }
  if (phone) {
    conditions.push(ilike(parcelsTable.senderPhone, `%${phone}%`));
  }
  if (dateFrom) conditions.push(gte(parcelsTable.createdAt, new Date(dateFrom as string)));
  if (dateTo) {
    const d = new Date(dateTo as string);
    d.setHours(23, 59, 59, 999);
    conditions.push(lte(parcelsTable.createdAt, d));
  }

  if (conditions.length === 0) { res.json([]); return; }
  const where = conditions.length > 1 ? or(...conditions) : conditions[0];
  const rows = await db.select().from(parcelsTable).where(where).orderBy(desc(parcelsTable.createdAt)).limit(50);

  const enriched = await Promise.all(rows.map(async p => {
    const [dst] = await db.select({ hubName: hubsTable.hubName, hubCode: hubsTable.hubCode }).from(hubsTable).where(eq(hubsTable.id, p.destinationHubId)).limit(1);
    return { ...p, weightKg: parseFloat(p.weightKg), charges: parseFloat(p.charges), destinationHubName: dst?.hubName ?? null, destinationHubCode: dst?.hubCode ?? null, bookedByName: null, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() };
  }));
  res.json(enriched);
});

export default router;
