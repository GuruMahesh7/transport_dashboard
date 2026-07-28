import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { hubsTable } from "./hubs";
import { staffTable } from "./staff";
import { itemsTable } from "./items";

export const parcelsTable = pgTable("parcels", {
  id: serial("id").primaryKey(),
  awbNumber: text("awb_number").notNull().unique(),
  senderName: text("sender_name").notNull(),
  senderPhone: text("sender_phone").notNull(),
  senderEmail: text("sender_email"),
  senderAddress: text("sender_address").notNull(),
  receiverName: text("receiver_name").notNull(),
  receiverPhone: text("receiver_phone").notNull(),
  receiverEmail: text("receiver_email"),
  receiverAddress: text("receiver_address").notNull(),
  numBoxes: integer("num_boxes").notNull().default(1),
  weightKg: numeric("weight_kg", { precision: 10, scale: 2 }).notNull(),
  itemId: integer("item_id").notNull().references(() => itemsTable.id),
  charges: numeric("charges", { precision: 10, scale: 2 }).notNull(),
  handlingFee: numeric("handling_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  paymentType: text("payment_type").notNull().default("To-Pay"),
  remarks: text("remarks"),
  destinationHubId: integer("destination_hub_id").notNull().references(() => hubsTable.id),
  currentStatus: text("current_status").notNull().default("BOOKED"),
  bookedBy: integer("booked_by").references(() => staffTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertParcelSchema = createInsertSchema(parcelsTable).omit({ id: true, createdAt: true, updatedAt: true, awbNumber: true, currentStatus: true });
export type InsertParcel = z.infer<typeof insertParcelSchema>;
export type Parcel = typeof parcelsTable.$inferSelect;
