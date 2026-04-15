import { Router } from "express";
import { db } from "@workspace/db";
import { accounts } from "@workspace/db/schema";
import { eq, ilike, or, count, isNull } from "drizzle-orm";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { writeAuditLog } from "../lib/audit";
import { parsePagination, paginate } from "../lib/pagination";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

const accountSchema = z.object({
  code: z.string().min(1),
  nameAr: z.string().min(2),
  nameEn: z.string().optional(),
  type: z.enum(["ASSET","LIABILITY","EQUITY","REVENUE","EXPENSE"]),
  normalBalance: z.enum(["DEBIT","CREDIT"]),
  level: z.number().int().min(1).max(3),
  parentId: z.string().uuid().optional(),
  allowPosting: z.boolean().default(false),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/accounts — flat list with optional search
router.get("/", requirePermission("accounts", "view"), async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const search = String(req.query.search ?? "");
    const where = search
      ? or(ilike(accounts.nameAr, `%${search}%`), ilike(accounts.code, `%${search}%`))
      : undefined;
    const [items, [{ total }]] = await Promise.all([
      db.select().from(accounts).where(where).limit(limit).offset(offset).orderBy(accounts.code),
      db.select({ total: count() }).from(accounts).where(where),
    ]);
    res.json(paginate(items, Number(total), { page, limit, offset }));
  } catch (err) { next(err); }
});

// GET /api/accounts/tree — hierarchical tree (level 1 → 2 → 3)
router.get("/tree", requirePermission("accounts", "view"), async (req, res, next) => {
  try {
    const all = await db.select().from(accounts).orderBy(accounts.code);
    const map = new Map<string, any>();
    const roots: any[] = [];
    for (const acc of all) {
      map.set(acc.id, { ...acc, children: [] });
    }
    for (const acc of all) {
      const node = map.get(acc.id)!;
      if (acc.parentId && map.has(acc.parentId)) {
        map.get(acc.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    res.json(roots);
  } catch (err) { next(err); }
});

// GET /api/accounts/postable — only accounts with allowPosting=true
router.get("/postable", requirePermission("accounts", "view"), async (req, res, next) => {
  try {
    const items = await db.select().from(accounts).where(eq(accounts.allowPosting, true)).orderBy(accounts.code);
    res.json(items);
  } catch (err) { next(err); }
});

// GET /api/accounts/:id
router.get("/:id", requirePermission("accounts", "view"), async (req, res, next) => {
  try {
    const account = await db.query.accounts.findFirst({ where: eq(accounts.id, req.params.id) });
    if (!account) { res.status(404).json({ error: "الحساب غير موجود" }); return; }
    res.json(account);
  } catch (err) { next(err); }
});

// POST /api/accounts
router.post("/", requirePermission("accounts", "create"), async (req, res, next) => {
  try {
    const body = accountSchema.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "بيانات غير صحيحة", details: body.error.issues }); return; }
    const existing = await db.query.accounts.findFirst({ where: eq(accounts.code, body.data.code) });
    if (existing) { res.status(409).json({ error: "كود الحساب موجود بالفعل" }); return; }
    if (body.data.parentId) {
      const parent = await db.query.accounts.findFirst({ where: eq(accounts.id, body.data.parentId) });
      if (!parent) { res.status(422).json({ error: "الحساب الأم غير موجود" }); return; }
      if (parent.allowPosting) { res.status(422).json({ error: "لا يمكن إنشاء حساب فرعي تحت حساب يسمح بالترحيل" }); return; }
    }
    const [created] = await db.insert(accounts).values({ ...body.data as any, createdBy: req.user!.sub as any }).returning();
    await writeAuditLog({ req, entityType: "accounts", entityId: created.id, action: "CREATE", after: created });
    res.status(201).json(created);
  } catch (err) { next(err); }
});

// PUT /api/accounts/:id
router.put("/:id", requirePermission("accounts", "edit"), async (req, res, next) => {
  try {
    const existing = await db.query.accounts.findFirst({ where: eq(accounts.id, req.params.id) });
    if (!existing) { res.status(404).json({ error: "الحساب غير موجود" }); return; }
    if (existing.isSystemAccount) { res.status(403).json({ error: "لا يمكن تعديل الحسابات النظامية" }); return; }
    const body = accountSchema.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "بيانات غير صحيحة" }); return; }
    const [updated] = await db.update(accounts).set({ ...body.data as any, updatedAt: new Date() as any })
      .where(eq(accounts.id, req.params.id)).returning();
    await writeAuditLog({ req, entityType: "accounts", entityId: req.params.id, action: "UPDATE", before: existing, after: updated });
    res.json(updated);
  } catch (err) { next(err); }
});

// PATCH /api/accounts/:id/toggle-active
router.patch("/:id/toggle-active", requirePermission("accounts", "edit"), async (req, res, next) => {
  try {
    const existing = await db.query.accounts.findFirst({ where: eq(accounts.id, req.params.id) });
    if (!existing) { res.status(404).json({ error: "الحساب غير موجود" }); return; }
    if (existing.isSystemAccount) { res.status(403).json({ error: "لا يمكن تغيير حالة الحسابات النظامية" }); return; }
    const [updated] = await db.update(accounts).set({ isActive: !existing.isActive, updatedAt: new Date() as any })
      .where(eq(accounts.id, req.params.id)).returning();
    res.json(updated);
  } catch (err) { next(err); }
});

export default router;
