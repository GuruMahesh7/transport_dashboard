import { Router } from "express";
import { db, complaintsTable, parcelsTable, staffTable } from "@workspace/db";
import { eq, and, or, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { generateComplaintNumber } from "../lib/awb";
import { createAuditLog } from "../lib/audit";

const router = Router();

async function enrichComplaint(c: any) {
  let awbNumber = null;
  if (c.parcelId) { const [p] = await db.select({ awbNumber: parcelsTable.awbNumber }).from(parcelsTable).where(eq(parcelsTable.id, c.parcelId)).limit(1); awbNumber = p?.awbNumber ?? null; }
  let raisedByName = null;
  if (c.raisedBy) { const [s] = await db.select({ name: staffTable.name }).from(staffTable).where(eq(staffTable.id, c.raisedBy)).limit(1); raisedByName = s?.name ?? null; }
  let assignedToName = null;
  if (c.assignedTo) { const [s] = await db.select({ name: staffTable.name }).from(staffTable).where(eq(staffTable.id, c.assignedTo)).limit(1); assignedToName = s?.name ?? null; }
  return { ...c, awbNumber, raisedByName, assignedToName, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() };
}

router.get("/complaints", requireAuth, async (req, res) => {
  const { status, parcelId } = req.query;
  const conditions: any[] = [];
  
  if (status) conditions.push(eq(complaintsTable.status, status as string));
  if (parcelId) conditions.push(eq(complaintsTable.parcelId, parseInt(parcelId as string)));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const queryResult = await db.select()
    .from(complaintsTable)
    .leftJoin(parcelsTable, eq(complaintsTable.parcelId, parcelsTable.id))
    .where(where)
    .orderBy(desc(complaintsTable.createdAt));

  const rows = queryResult.map(r => r.complaints);
  res.json(await Promise.all(rows.map(enrichComplaint)));
});

router.post("/complaints", requireAuth, async (req, res) => {
  const staff = (req as any).staff;
  const { parcelId, complaintType, description, images = [] } = req.body;
  const complaintNumber = await generateComplaintNumber();
  const [complaint] = await db.insert(complaintsTable).values({ complaintNumber, parcelId, raisedBy: staff.id, complaintType, description, images, status: "RAISED" }).returning();
  await createAuditLog({ action: "CREATE", entityType: "complaint", entityId: complaint.id, newValue: { complaintNumber, complaintType }, performedBy: staff.id, description: `Raised complaint ${complaintNumber}` });
  res.status(201).json(await enrichComplaint(complaint));
});

router.get("/complaints/:complaintId", requireAuth, async (req, res) => {
  const [c] = await db.select().from(complaintsTable).where(eq(complaintsTable.id, parseInt(req.params.complaintId as string))).limit(1);
  if (!c) { res.status(404).json({ error: "Complaint not found" }); return; }
  res.json(await enrichComplaint(c));
});

router.patch("/complaints/:complaintId", requireAuth, async (req, res) => {
  const complaintId = parseInt(req.params.complaintId as string);
  const { status, assignedTo, resolutionNotes } = req.body;
  const updates: any = {};
  if (status !== undefined) updates.status = status;
  if (assignedTo !== undefined) updates.assignedTo = assignedTo;
  if (resolutionNotes !== undefined) updates.resolutionNotes = resolutionNotes;

  await db.update(complaintsTable).set(updates).where(eq(complaintsTable.id, complaintId));
  const [c] = await db.select().from(complaintsTable).where(eq(complaintsTable.id, complaintId)).limit(1);
  if (!c) { res.status(404).json({ error: "Complaint not found" }); return; }
  const actor = (req as any).staff;
  await createAuditLog({ action: "UPDATE", entityType: "complaint", entityId: complaintId, newValue: updates, performedBy: actor.id, description: `Updated complaint ${c.complaintNumber}` });
  res.json(await enrichComplaint(c));
});

export default router;
