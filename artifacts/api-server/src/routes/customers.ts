import { Router } from "express";
import { db } from "@workspace/db";
import { customers } from "@workspace/db/schema";
import { eq, ilike, or, count } from "drizzle-orm";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { writeAuditLog } from "../lib/audit";
import { parsePagination, paginate } from "../lib/pagination";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

const customerSchema = z.object({
  code: z.string().min(1),
  nameAr: z.string().min(2),
  nameEn: z.string().optional(),
  type: z.enum(["COMPANY", "INDIVIDUAL", "GOVERNMENT"]).optional(),
  vatNumber: z.string().optional(),
  crNumber: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
  branchId: z.string().uuid().optional(),
  paymentTerms: z.enum(["CASH","CREDIT_7","CREDIT_15","CREDIT_30","CREDIT_60","CREDIT_90"]).optional(),
  creditLimit: z.string().optional(),
  receivableAccountId: z.string().uuid().optional(),
  status: z.enum(["ACTIVE","INACTIVE","ARCHIVED"]).optional(),
});

// GET /api/customers
router.get("/", requirePermission("customers", "view"), async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const search = String(req.query.search ?? "");
    const status = req.query.status as string | undefined;
    const where = search
      ? or(ilike(customers.nameAr, `%${search}%`), ilike(customers.code, `%${search}%`))
      : undefined;
    const [items, [{ total }]] = await Promise.all([
      db.select().from(customers).where(where).limit(limit).offset(offset).orderBy(customers.nameAr),
      db.select({ total: count() }).from(customers).where(where),
    ]);
    res.json(paginate(items, Number(total), { page, limit, offset }));
  } catch (err) { next(err); }
});

// GET /api/customers/:id
router.get("/:id", requirePermission("customers", "view"), async (req, res, next) => {
  try {
    const customer = await db.query.customers.findFirst({ where: eq(customers.id, req.params.id) });
    if (!customer) { res.status(404).json({ error: "العميل غير موجود" }); return; }
    res.json(customer);
  } catch (err) { next(err); }
});

// POST /api/customers
router.post("/", requirePermission("customers", "create"), async (req, res, next) => {
  try {
    const body = customerSchema.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "بيانات غير صحيحة", details: body.error.issues }); return; }
    const existing = await db.query.customers.findFirst({ where: eq(customers.code, body.data.code) });
    if (existing) { res.status(409).json({ error: "كود العميل موجود بالفعل" }); return; }
    const [created] = await db.insert(customers).values({ ...body.data as any, createdBy: req.user!.sub as any }).returning();
    await writeAuditLog({ req, entityType: "customers", entityId: created.id, action: "CREATE", after: created });
    res.status(201).json(created);
  } catch (err) { next(err); }
});

// PUT /api/customers/:id
router.put("/:id", requirePermission("customers", "edit"), async (req, res, next) => {
  try {
    const existing = await db.query.customers.findFirst({ where: eq(customers.id, req.params.id) });
    if (!existing) { res.status(404).json({ error: "العميل غير موجود" }); return; }
    const body = customerSchema.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "بيانات غير صحيحة" }); return; }
    const [updated] = await db.update(customers).set({ ...body.data as any, updatedAt: new Date() as any, updatedBy: req.user!.sub as any })
      .where(eq(customers.id, req.params.id)).returning();
    await writeAuditLog({ req, entityType: "customers", entityId: req.params.id, action: "UPDATE", before: existing, after: updated });
    res.json(updated);
  } catch (err) { next(err); }
});

// PATCH /api/customers/:id/status
router.patch("/:id/status", requirePermission("customers", "edit"), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["ACTIVE","INACTIVE","ARCHIVED"].includes(status)) { res.status(400).json({ error: "حالة غير صالحة" }); return; }
    const [updated] = await db.update(customers).set({ status, updatedAt: new Date() as any })
      .where(eq(customers.id, req.params.id)).returning();
    await writeAuditLog({ req, entityType: "customers", entityId: req.params.id, action: "STATUS_CHANGE", after: { status } });
    res.json(updated);
  } catch (err) { next(err); }
});

export default router;
