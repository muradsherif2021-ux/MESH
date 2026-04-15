import { Router } from "express";
import { db } from "@workspace/db";
import { treasuries, accounts } from "@workspace/db/schema";
import { eq, ilike, count } from "drizzle-orm";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { writeAuditLog } from "../lib/audit";
import { parsePagination, paginate } from "../lib/pagination";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

const treasurySchema = z.object({
  code: z.string().min(1),
  nameAr: z.string().min(2),
  nameEn: z.string().optional(),
  cashAccountId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  responsibleUserId: z.string().uuid().optional(),
  notes: z.string().optional(),
  status: z.enum(["ACTIVE","INACTIVE","ARCHIVED"]).optional(),
});

router.get("/", requirePermission("treasuries", "view"), async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const [items, [{ total }]] = await Promise.all([
      db.select().from(treasuries).limit(limit).offset(offset).orderBy(treasuries.nameAr),
      db.select({ total: count() }).from(treasuries),
    ]);
    res.json(paginate(items, Number(total), { page, limit, offset }));
  } catch (err) { next(err); }
});

router.get("/:id", requirePermission("treasuries", "view"), async (req, res, next) => {
  try {
    const treasury = await db.query.treasuries.findFirst({ where: eq(treasuries.id, req.params.id) });
    if (!treasury) { res.status(404).json({ error: "الخزينة غير موجودة" }); return; }
    res.json(treasury);
  } catch (err) { next(err); }
});

router.post("/", requirePermission("treasuries", "create"), async (req, res, next) => {
  try {
    const body = treasurySchema.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "بيانات غير صحيحة", details: body.error.issues }); return; }
    // Validate that linked account allows posting
    const account = await db.query.accounts.findFirst({ where: eq(accounts.id, body.data.cashAccountId) });
    if (!account?.allowPosting) { res.status(422).json({ error: "الحساب المرتبط لا يسمح بالترحيل المباشر" }); return; }
    const [created] = await db.insert(treasuries).values({ ...body.data as any, createdBy: req.user!.sub as any }).returning();
    await writeAuditLog({ req, entityType: "treasuries", entityId: created.id, action: "CREATE", after: created });
    res.status(201).json(created);
  } catch (err) { next(err); }
});

router.put("/:id", requirePermission("treasuries", "edit"), async (req, res, next) => {
  try {
    const existing = await db.query.treasuries.findFirst({ where: eq(treasuries.id, req.params.id) });
    if (!existing) { res.status(404).json({ error: "الخزينة غير موجودة" }); return; }
    const body = treasurySchema.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "بيانات غير صحيحة" }); return; }
    const [updated] = await db.update(treasuries).set({ ...body.data as any, updatedAt: new Date() as any })
      .where(eq(treasuries.id, req.params.id)).returning();
    await writeAuditLog({ req, entityType: "treasuries", entityId: req.params.id, action: "UPDATE", before: existing, after: updated });
    res.json(updated);
  } catch (err) { next(err); }
});

export default router;
