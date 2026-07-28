import { db, parcelsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

export async function generateAwbNumber(): Promise<string> {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}${mm}${dd}`;
  const prefix = `HB${dateStr}`;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(parcelsTable)
    .where(sql`awb_number LIKE ${prefix + "%"}`);

  const seq = (Number(result[0].count) + 1).toString().padStart(4, "0");
  return `${prefix}${seq}`;
}

export async function generateComplaintNumber(): Promise<string> {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const prefix = `CMP${yyyy}${mm}`;
  return `${prefix}${Date.now().toString().slice(-4)}`;
}
