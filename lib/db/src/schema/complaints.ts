import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { parcelsTable } from "./parcels";
import { staffTable } from "./staff";

export const complaintsTable = pgTable("complaints", {
  id: serial("id").primaryKey(),
  complaintNumber: text("complaint_number").notNull().unique(),
  parcelId: integer("parcel_id").notNull().references(() => parcelsTable.id),
  raisedBy: integer("raised_by").notNull().references(() => staffTable.id),
  complaintType: text("complaint_type").notNull(),
  description: text("description").notNull(),
  images: text("images").array().notNull().default([]),
  status: text("status").notNull().default("RAISED"),
  assignedTo: integer("assigned_to").references(() => staffTable.id),
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertComplaintSchema = createInsertSchema(complaintsTable).omit({ id: true, createdAt: true, updatedAt: true, complaintNumber: true, status: true });
export type InsertComplaint = z.infer<typeof insertComplaintSchema>;
export type Complaint = typeof complaintsTable.$inferSelect;
