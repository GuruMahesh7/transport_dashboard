import { Router } from "express";
import { db } from "@workspace/db";
import { itemsTable } from "@workspace/db/schema";
import { z } from "zod/v4";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const items = await db.select().from(itemsTable).orderBy(itemsTable.name);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

router.post("/", async (req, res) => {
  try {
    const schema = z.object({
      name: z.string(),
      defaultPrice: z.number(),
      defaultHandlingFee: z.number().optional().default(0)
    });
    const body = schema.parse(req.body);

    const [item] = await db
      .insert(itemsTable)
      .values({
        name: body.name,
        defaultPrice: body.defaultPrice.toString(),
        defaultHandlingFee: body.defaultHandlingFee.toString()
      })
      .returning();

    res.status(201).json(item);
  } catch (error: any) {
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: "Item with this name already exists" });
      return;
    }
    res.status(400).json({ error: error.message || "Failed to create item" });
  }
});

export const itemsRouter = router;
