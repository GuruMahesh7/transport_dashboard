import { createHash } from "crypto";
import { db, staffTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { type Request, type Response, type NextFunction } from "express";

export function hashPassword(password: string): string {
  return createHash("sha256").update(password + (process.env.SESSION_SECRET || "tms-secret")).digest("hex");
}

export function signToken(staffId: number): string {
  const payload = { staffId, iat: Date.now() };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHash("sha256").update(encoded + (process.env.SESSION_SECRET || "tms-secret")).digest("hex");
  return `${encoded}.${sig}`;
}

export function verifyToken(token: string): { staffId: number } | null {
  try {
    const [encoded, sig] = token.split(".");
    const expectedSig = createHash("sha256").update(encoded + (process.env.SESSION_SECRET || "tms-secret")).digest("hex");
    if (sig !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());
    return { staffId: payload.staffId };
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  const [staff] = await db
    .select({
      id: staffTable.id,
      name: staffTable.name,
      phone: staffTable.phone,
      email: staffTable.email,
      role: staffTable.role,
      isActive: staffTable.isActive,
    })
    .from(staffTable)
    .where(eq(staffTable.id, payload.staffId))
    .limit(1);

  if (!staff || !staff.isActive) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as any).staff = staff;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const staff = (req as any).staff;
    if (!staff || !roles.includes(staff.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
