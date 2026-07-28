import { Router } from "express";
import { db, staffTable, hubsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole, hashPassword } from "../lib/auth";
import { createAuditLog } from "../lib/audit";
import { sql } from "drizzle-orm";

const router = Router();

const staffWithHub = async (whereClause?: any) => {
  const query = db
    .select({
      id: staffTable.id,
      name: staffTable.name,
      phone: staffTable.phone,
      email: staffTable.email,
      role: staffTable.role,
      isActive: staffTable.isActive,
      createdAt: staffTable.createdAt,
    })
    .from(staffTable);
  if (whereClause) return query.where(whereClause);
  return query;
};

router.get("/staff", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  const { role } = req.query;
  const conditions = [];
  if (role) conditions.push(eq(staffTable.role, role as string));

  const query = db
    .select({
      id: staffTable.id,
      name: staffTable.name,
      phone: staffTable.phone,
      email: staffTable.email,
      role: staffTable.role,
      isActive: staffTable.isActive,
      createdAt: staffTable.createdAt,
    })
    .from(staffTable);

  const rows = conditions.length > 0 ? await query.where(and(...conditions)) : await query;
  res.json(rows.map(s => ({ ...s, createdAt: s.createdAt.toISOString() })));
});

router.get("/staff/:staffId", requireAuth, async (req, res) => {
  const staffId = parseInt(req.params.staffId as string);
  const [s] = await db
    .select({
      id: staffTable.id,
      name: staffTable.name,
      phone: staffTable.phone,
      email: staffTable.email,
      role: staffTable.role,
      isActive: staffTable.isActive,
      createdAt: staffTable.createdAt,
    })
    .from(staffTable)
    .where(eq(staffTable.id, staffId))
    .limit(1);
  if (!s) { res.status(404).json({ error: "Staff not found" }); return; }
  res.json({ ...s, createdAt: s.createdAt.toISOString() });
});

router.post("/staff", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  const { name, phone, email, password, role } = req.body;
  const passwordHash = hashPassword(password);
  const [s] = await db.insert(staffTable).values({ name, phone, email, passwordHash, role }).returning();
  const actor = (req as any).staff;
  await createAuditLog({ action: "CREATE", entityType: "staff", entityId: s.id, newValue: { name, email, role }, performedBy: actor.id, description: `Created staff ${name}` });

  const [result] = await db
    .select({ id: staffTable.id, name: staffTable.name, phone: staffTable.phone, email: staffTable.email, role: staffTable.role, isActive: staffTable.isActive, createdAt: staffTable.createdAt })
    .from(staffTable)
    .where(eq(staffTable.id, s.id))
    .limit(1);
  res.status(201).json({ ...result, createdAt: result.createdAt.toISOString() });
});

router.patch("/staff/:staffId", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  const staffId = parseInt(req.params.staffId as string);
  const { name, phone, email, role } = req.body;
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (email !== undefined) updates.email = email;
  if (role !== undefined) updates.role = role;

  await db.update(staffTable).set(updates).where(eq(staffTable.id, staffId));
  const actor = (req as any).staff;
  await createAuditLog({ action: "UPDATE", entityType: "staff", entityId: staffId, newValue: updates, performedBy: actor.id, description: `Updated staff` });

  const [result] = await db
    .select({ id: staffTable.id, name: staffTable.name, phone: staffTable.phone, email: staffTable.email, role: staffTable.role, isActive: staffTable.isActive, createdAt: staffTable.createdAt })
    .from(staffTable)
    .where(eq(staffTable.id, staffId))
    .limit(1);
  if (!result) { res.status(404).json({ error: "Staff not found" }); return; }
  res.json({ ...result, createdAt: result.createdAt.toISOString() });
});

router.patch("/staff/:staffId/toggle-active", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  const staffId = parseInt(req.params.staffId as string);
  const [existing] = await db.select().from(staffTable).where(eq(staffTable.id, staffId)).limit(1);
  if (!existing) { res.status(404).json({ error: "Staff not found" }); return; }
  await db.update(staffTable).set({ isActive: !existing.isActive }).where(eq(staffTable.id, staffId));
  const actor = (req as any).staff;
  await createAuditLog({ action: existing.isActive ? "DEACTIVATE" : "ACTIVATE", entityType: "staff", entityId: staffId, performedBy: actor.id, description: `${existing.isActive ? "Deactivated" : "Activated"} staff ${existing.name}` });

  const [result] = await db
    .select({ id: staffTable.id, name: staffTable.name, phone: staffTable.phone, email: staffTable.email, role: staffTable.role, isActive: staffTable.isActive, createdAt: staffTable.createdAt })
    .from(staffTable)
    .where(eq(staffTable.id, staffId))
    .limit(1);
  res.json({ ...result!, createdAt: result!.createdAt.toISOString() });
});

export default router;
