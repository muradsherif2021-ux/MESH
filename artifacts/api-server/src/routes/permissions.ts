import { Router } from "express";
import { db } from "@workspace/db";
import { permissions } from "@workspace/db/schema";
import { eq, count } from "drizzle-orm";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { parsePagination, paginate } from "../lib/pagination";

const router = Router();
router.use(requireAuth);

// GET /api/permissions
router.get("/", requirePermission("permissions", "view"), async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const [items, [{ total }]] = await Promise.all([
      db.select().from(permissions).limit(limit).offset(offset).orderBy(permissions.module, permissions.screen, permissions.action),
      db.select({ total: count() }).from(permissions),
    ]);
    // Group by module for UI consumption
    const grouped: Record<string, typeof items> = {};
    for (const p of items) {
      if (!grouped[p.module]) grouped[p.module] = [];
      grouped[p.module].push(p);
    }
    res.json({ ...paginate(items, Number(total), { page, limit, offset }), grouped });
  } catch (err) { next(err); }
});

export default router;
