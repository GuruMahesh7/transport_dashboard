import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { parcelsTable } from "./parcels";
import { staffTable } from "./staff";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const parcelStatusHistoryTable = pgTable("parcel_status_history", {
  id: serial("id").primaryKey(),
  parcelId: integer("parcel_id").notNull().references(() => parcelsTable.id),
  status: text("status").notNull(),
  updatedBy: integer("updated_by").references(() => staffTable.id),
  notes: text("notes"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertParcelStatusHistorySchema = createInsertSchema(parcelStatusHistoryTable).omit({ id: true, timestamp: true });
export type InsertParcelStatusHistory = z.infer<typeof insertParcelStatusHistorySchema>;
export type ParcelStatusHistory = typeof parcelStatusHistoryTable.$inferSelect;
