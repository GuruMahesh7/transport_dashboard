import { Router } from "express";
import { db, hubsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { createAuditLog } from "../lib/audit";

const router = Router();

router.get("/hubs", requireAuth, async (req, res) => {
  const hubs = await db.select().from(hubsTable).orderBy(hubsTable.hubName);
  res.json(hubs.map(h => ({
    ...h,
    createdAt: h.createdAt.toISOString(),
  })));
});

router.get("/hubs/:hubId", requireAuth, async (req, res) => {
  const hubId = parseInt(req.params.hubId as string);
  const [hub] = await db.select().from(hubsTable).where(eq(hubsTable.id, hubId)).limit(1);
  if (!hub) { res.status(404).json({ error: "Hub not found" }); return; }
  res.json({ ...hub, createdAt: hub.createdAt.toISOString() });
});

router.post("/hubs", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  const { hubName, hubCode, address, contactNumber } = req.body;
  const [hub] = await db.insert(hubsTable).values({ hubName, hubCode, address, contactNumber }).returning();
  const staff = (req as any).staff;
  await createAuditLog({ action: "CREATE", entityType: "hub", entityId: hub.id, newValue: hub, performedBy: staff.id, description: `Created hub ${hubName}` });
  res.status(201).json({ ...hub, createdAt: hub.createdAt.toISOString() });
});

router.patch("/hubs/:hubId", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  const hubId = parseInt(req.params.hubId as string);
  const { hubName, hubCode, address, contactNumber } = req.body;
  const updates: any = {};
  if (hubName !== undefined) updates.hubName = hubName;
  if (hubCode !== undefined) updates.hubCode = hubCode;
  if (address !== undefined) updates.address = address;
  if (contactNumber !== undefined) updates.contactNumber = contactNumber;

  const [hub] = await db.update(hubsTable).set(updates).where(eq(hubsTable.id, hubId)).returning();
  if (!hub) { res.status(404).json({ error: "Hub not found" }); return; }
  const staff = (req as any).staff;
  await createAuditLog({ action: "UPDATE", entityType: "hub", entityId: hubId, newValue: hub, performedBy: staff.id, description: `Updated hub ${hub.hubName}` });
  res.json({ ...hub, createdAt: hub.createdAt.toISOString() });
});

router.patch("/hubs/:hubId/toggle-active", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  const hubId = parseInt(req.params.hubId as string);
  const [existing] = await db.select().from(hubsTable).where(eq(hubsTable.id, hubId)).limit(1);
  if (!existing) { res.status(404).json({ error: "Hub not found" }); return; }
  const [hub] = await db.update(hubsTable).set({ isActive: !existing.isActive }).where(eq(hubsTable.id, hubId)).returning();
  const staff = (req as any).staff;
  await createAuditLog({ action: hub.isActive ? "ACTIVATE" : "DEACTIVATE", entityType: "hub", entityId: hubId, performedBy: staff.id, description: `${hub.isActive ? "Activated" : "Deactivated"} hub ${hub.hubName}` });
  res.json({ ...hub, createdAt: hub.createdAt.toISOString() });
});

export default router;
