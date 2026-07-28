import { Router } from "express";
import { db, staffTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, signToken, requireAuth } from "../lib/auth";

const router = Router();

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }
  const [staff] = await db
    .select({
      id: staffTable.id,
      name: staffTable.name,
      phone: staffTable.phone,
      email: staffTable.email,
      passwordHash: staffTable.passwordHash,
      role: staffTable.role,
      isActive: staffTable.isActive,
    })
    .from(staffTable)
    .where(eq(staffTable.email, email))
    .limit(1);

  if (!staff || !staff.isActive) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const hash = hashPassword(password);
  if (hash !== staff.passwordHash) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = signToken(staff.id);
  const { passwordHash: _, ...staffData } = staff;
  res.json({
    token,
    staff: {
      ...staffData,
      createdAt: new Date().toISOString(),
    },
  });
});

router.get("/auth/me", requireAuth, (req, res) => {
  const staff = (req as any).staff;
  res.json({
    ...staff,
    createdAt: new Date().toISOString(),
  });
});

router.post("/auth/logout", (req, res) => {
  res.json({ success: true });
});

export default router;
