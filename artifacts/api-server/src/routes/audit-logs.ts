import { Router } from "express";
import { db } from "@workspace/db";
import { auditLogs } from "@workspace/db/schema";
import { eq, and, gte, lte, count, desc } from "drizzle-orm";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { parsePagination, paginate } from "../lib/pagination";

const router = Router();
router.use(requireAuth);

// GET /api/audit-logs
router.get("/", requirePermission("audit_logs", "view"), async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const entityType = req.query.entityType as string | undefined;
    const entityId = req.query.entityId as string | undefined;
    const actorId = req.query.actorId as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const conditions = [];
    if (entityType) conditions.push(eq(auditLogs.entityType, entityType));
    if (entityId) conditions.push(eq(auditLogs.entityId, entityId as any));
    if (actorId) conditions.push(eq(auditLogs.actorId, actorId as any));
    if (from) conditions.push(gte(auditLogs.createdAt, new Date(from) as any));
    if (to) conditions.push(lte(auditLogs.createdAt, new Date(to) as any));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, [{ total }]] = await Promise.all([
      db.select().from(auditLogs).where(where).limit(limit).offset(offset).orderBy(desc(auditLogs.createdAt)),
      db.select({ total: count() }).from(auditLogs).where(where),
    ]);
    res.json(paginate(items, Number(total), { page, limit, offset }));
  } catch (err) { next(err); }
});

export default router;
