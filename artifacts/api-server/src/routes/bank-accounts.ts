import { Router } from "express";
import { db } from "@workspace/db";
import { bankAccounts, accounts } from "@workspace/db/schema";
import { eq, ilike, count } from "drizzle-orm";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { writeAuditLog } from "../lib/audit";
import { parsePagination, paginate } from "../lib/pagination";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

const bankAccountSchema = z.object({
  code: z.string().min(1),
  nameAr: z.string().min(2),
  nameEn: z.string().optional(),
  bankName: z.string().min(2),
  accountNumber: z.string().optional(),
  iban: z.string().optional(),
  currency: z.string().default("SAR"),
  linkedAccountId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  notes: z.string().optional(),
  status: z.enum(["ACTIVE","INACTIVE","ARCHIVED"]).optional(),
});

router.get("/", requirePermission("bank_accounts", "view"), async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const [items, [{ total }]] = await Promise.all([
      db.select().from(bankAccounts).limit(limit).offset(offset).orderBy(bankAccounts.nameAr),
      db.select({ total: count() }).from(bankAccounts),
    ]);
    res.json(paginate(items, Number(total), { page, limit, offset }));
  } catch (err) { next(err); }
});

router.get("/:id", requirePermission("bank_accounts", "view"), async (req, res, next) => {
  try {
    const ba = await db.query.bankAccounts.findFirst({ where: eq(bankAccounts.id, req.params.id) });
    if (!ba) { res.status(404).json({ error: "الحساب البنكي غير موجود" }); return; }
    res.json(ba);
  } catch (err) { next(err); }
});

router.post("/", requirePermission("bank_accounts", "create"), async (req, res, next) => {
  try {
    const body = bankAccountSchema.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "بيانات غير صحيحة", details: body.error.issues }); return; }
    const account = await db.query.accounts.findFirst({ where: eq(accounts.id, body.data.linkedAccountId) });
    if (!account?.allowPosting) { res.status(422).json({ error: "الحساب المرتبط لا يسمح بالترحيل المباشر" }); return; }
    const [created] = await db.insert(bankAccounts).values({ ...body.data as any, createdBy: req.user!.sub as any }).returning();
    await writeAuditLog({ req, entityType: "bank_accounts", entityId: created.id, action: "CREATE", after: created });
    res.status(201).json(created);
  } catch (err) { next(err); }
});

router.put("/:id", requirePermission("bank_accounts", "edit"), async (req, res, next) => {
  try {
    const existing = await db.query.bankAccounts.findFirst({ where: eq(bankAccounts.id, req.params.id) });
    if (!existing) { res.status(404).json({ error: "الحساب البنكي غير موجود" }); return; }
    const body = bankAccountSchema.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "بيانات غير صحيحة" }); return; }
    const [updated] = await db.update(bankAccounts).set({ ...body.data as any, updatedAt: new Date() as any })
      .where(eq(bankAccounts.id, req.params.id)).returning();
    await writeAuditLog({ req, entityType: "bank_accounts", entityId: req.params.id, action: "UPDATE", before: existing, after: updated });
    res.json(updated);
  } catch (err) { next(err); }
});

export default router;
