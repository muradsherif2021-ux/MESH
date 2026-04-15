import { Router } from "express";
import { db } from "@workspace/db";
import { sequences } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

function generateNumber(seq: typeof sequences.$inferSelect): string {
  const year = new Date().getFullYear();
  const num = String(seq.nextNumber).padStart(seq.paddingLength, "0");
  const yearPart = seq.includeYear ? `${year}-` : "";
  return `${seq.prefix}${yearPart}${num}${seq.suffix}`;
}

// GET /api/sequences
router.get("/", requirePermission("settings", "view"), async (req, res, next) => {
  try {
    const items = await db.select().from(sequences).orderBy(sequences.module);
    res.json(items);
  } catch (err) { next(err); }
});

// GET /api/sequences/:module/next — preview next number without consuming it
router.get("/:module/next", requirePermission("settings", "view"), async (req, res, next) => {
  try {
    const seq = await db.query.sequences.findFirst({ where: eq(sequences.module, req.params.module) });
    if (!seq) { res.status(404).json({ error: "التسلسل غير موجود" }); return; }
    res.json({ next: generateNumber(seq), ...seq });
  } catch (err) { next(err); }
});

// POST /api/sequences/:module/consume — consume next number (transactional)
router.post("/:module/consume", requireAuth, async (req, res, next) => {
  try {
    const [seq] = await db.select().from(sequences).where(eq(sequences.module, req.params.module)).for("update");
    if (!seq) { res.status(404).json({ error: "التسلسل غير موجود" }); return; }

    const currentYear = new Date().getFullYear();
    let nextNumber = seq.nextNumber;

    // Reset if year changed and reset is configured
    if (seq.resetYearly && seq.currentYear !== currentYear) {
      nextNumber = 1;
    }

    const generated = generateNumber({ ...seq, nextNumber, currentYear });
    await db.update(sequences).set({
      nextNumber: nextNumber + 1,
      currentYear,
      updatedAt: new Date() as any,
    }).where(eq(sequences.module, req.params.module));

    res.json({ number: generated });
  } catch (err) { next(err); }
});

// PUT /api/sequences/:module
router.put("/:module", requirePermission("settings", "edit"), async (req, res, next) => {
  try {
    const schema = z.object({
      prefix: z.string(),
      suffix: z.string().optional(),
      includeYear: z.boolean(),
      paddingLength: z.number().int().min(1).max(10),
      nextNumber: z.number().int().min(1),
      resetYearly: z.boolean(),
    });
    const body = schema.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "بيانات غير صحيحة" }); return; }
    const [updated] = await db.update(sequences).set({ ...body.data, updatedAt: new Date() as any })
      .where(eq(sequences.module, req.params.module)).returning();
    res.json(updated);
  } catch (err) { next(err); }
});

export default router;
