import { Router } from "express";
import { db } from "@workspace/db";
import { costSources, shippingAgents, journalEntries } from "@workspace/db/schema";
import { eq, ilike, or, count, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { parsePagination, paginate } from "../lib/pagination";

const router = Router();
router.use(requireAuth);

const SOURCE_TYPE_LABELS: Record<string, string> = {
  AGENT_TRIP: "رحلة وكيل شحن",
  AGENT_EXTRA_FEE: "رسوم إضافية وكيل",
  CUSTOMS_PAYMENT: "سداد رسوم جمركية",
  FIELD_ADVANCE: "سلفة ميدانية / سائق",
  OTHER_ON_BEHALF_COST: "تكلفة بالنيابة متنوعة",
};

const STATUS_LABELS: Record<string, string> = {
  UNALLOCATED: "غير مخصص",
  PARTIALLY_ALLOCATED: "مخصص جزئياً",
  FULLY_ALLOCATED: "مخصص بالكامل",
  CANCELLED: "ملغى",
};

// GET /api/cost-sources
router.get("/", requirePermission("cost_sources", "view"), async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const search = String(req.query.search ?? "");
    const status = req.query.status as string | undefined;
    const sourceType = req.query.sourceType as string | undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;

    const conditions = [];
    if (search) conditions.push(or(
      ilike(costSources.sourceNumber, `%${search}%`),
      ilike(costSources.description, `%${search}%`),
      ilike(costSources.operationRef, `%${search}%`),
    ));
    if (status) conditions.push(eq(costSources.status, status as any));
    if (sourceType) conditions.push(eq(costSources.sourceType, sourceType as any));
    if (dateFrom) conditions.push(gte(costSources.date, dateFrom));
    if (dateTo) conditions.push(lte(costSources.date, dateTo));
    const where = conditions.length ? and(...conditions) : undefined;

    const [items, [{ total }], [summary]] = await Promise.all([
      db.select({
        cs: costSources,
        agentNameAr: shippingAgents.nameAr,
        agentCode: shippingAgents.code,
      })
        .from(costSources)
        .leftJoin(shippingAgents, eq(costSources.agentId, shippingAgents.id))
        .where(where).limit(limit).offset(offset).orderBy(costSources.createdAt),
      db.select({ total: count() }).from(costSources).where(where),
      db.select({
        totalAmount: sql<string>`COALESCE(SUM(${costSources.totalAmount}), 0)`,
        totalAllocated: sql<string>`COALESCE(SUM(${costSources.allocatedAmount}), 0)`,
        totalRemaining: sql<string>`COALESCE(SUM(${costSources.remainingAmount}), 0)`,
      }).from(costSources).where(where),
    ]);

    const data = items.map(r => ({
      ...r.cs,
      sourceTypeLabel: SOURCE_TYPE_LABELS[r.cs.sourceType ?? ""] ?? r.cs.sourceType,
      statusLabel: STATUS_LABELS[r.cs.status ?? ""] ?? r.cs.status,
      agentNameAr: r.agentNameAr,
      agentCode: r.agentCode,
    }));

    res.json({
      ...paginate(data, Number(total), { page, limit, offset }),
      summary: summary ?? { totalAmount: "0", totalAllocated: "0", totalRemaining: "0" },
    });
  } catch (err) { next(err); }
});

// GET /api/cost-sources/:id
router.get("/:id", requirePermission("cost_sources", "view"), async (req, res, next) => {
  try {
    const rows = await db.select({
      cs: costSources,
      agentNameAr: shippingAgents.nameAr,
      agentCode: shippingAgents.code,
      jeNumber: journalEntries.number,
    })
      .from(costSources)
      .leftJoin(shippingAgents, eq(costSources.agentId, shippingAgents.id))
      .leftJoin(journalEntries, eq(costSources.journalEntryId, journalEntries.id))
      .where(eq(costSources.id, req.params.id)).limit(1);

    if (!rows.length) { res.status(404).json({ error: "مصدر التكلفة غير موجود" }); return; }
    const row = rows[0];
    res.json({
      ...row.cs,
      sourceTypeLabel: SOURCE_TYPE_LABELS[row.cs.sourceType ?? ""] ?? row.cs.sourceType,
      statusLabel: STATUS_LABELS[row.cs.status ?? ""] ?? row.cs.status,
      agentNameAr: row.agentNameAr,
      agentCode: row.agentCode,
      jeNumber: row.jeNumber,
    });
  } catch (err) { next(err); }
});

// GET /api/cost-sources/unallocated — for use in Phase 4 invoice allocation
router.get("/query/unallocated", requirePermission("cost_sources", "view"), async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const sourceType = req.query.sourceType as string | undefined;

    const conditions = [
      or(
        eq(costSources.status, "UNALLOCATED"),
        eq(costSources.status, "PARTIALLY_ALLOCATED"),
      ),
    ];
    if (sourceType) conditions.push(eq(costSources.sourceType, sourceType as any));
    const where = and(...conditions);

    const [items, [{ total }]] = await Promise.all([
      db.select({ cs: costSources, agentNameAr: shippingAgents.nameAr })
        .from(costSources)
        .leftJoin(shippingAgents, eq(costSources.agentId, shippingAgents.id))
        .where(where).limit(limit).offset(offset).orderBy(costSources.date),
      db.select({ total: count() }).from(costSources).where(where),
    ]);

    const data = items.map(r => ({
      ...r.cs,
      sourceTypeLabel: SOURCE_TYPE_LABELS[r.cs.sourceType ?? ""] ?? r.cs.sourceType,
      agentNameAr: r.agentNameAr,
    }));
    res.json(paginate(data, Number(total), { page, limit, offset }));
  } catch (err) { next(err); }
});

export default router;
