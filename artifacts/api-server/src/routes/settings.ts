import { Router } from "express";
import { db } from "@workspace/db";
import { settings } from "@workspace/db/schema";
import { eq, ilike } from "drizzle-orm";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { writeAuditLog } from "../lib/audit";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

// GET /api/settings
router.get("/", requirePermission("settings", "view"), async (req, res, next) => {
  try {
    const items = await db.select().from(settings).orderBy(settings.category, settings.key);
    // Group by category
    const grouped: Record<string, typeof items> = {};
    for (const s of items) {
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push(s);
    }
    res.json({ items, grouped });
  } catch (err) { next(err); }
});

// GET /api/settings/:key
router.get("/:key", requirePermission("settings", "view"), async (req, res, next) => {
  try {
    const setting = await db.query.settings.findFirst({ where: eq(settings.key, req.params.key) });
    if (!setting) { res.status(404).json({ error: "الإعداد غير موجود" }); return; }
    res.json(setting);
  } catch (err) { next(err); }
});

// PATCH /api/settings/:key
router.patch("/:key", requirePermission("settings", "edit"), async (req, res, next) => {
  try {
    const { value, valueJson } = req.body;
    const existing = await db.query.settings.findFirst({ where: eq(settings.key, req.params.key) });
    if (!existing) { res.status(404).json({ error: "الإعداد غير موجود" }); return; }
    const [updated] = await db.update(settings)
      .set({ value, valueJson, updatedAt: new Date() as any, updatedBy: req.user!.sub as any })
      .where(eq(settings.key, req.params.key)).returning();
    await writeAuditLog({ req, entityType: "settings", entityId: existing.id, action: "UPDATE", before: existing, after: updated });
    res.json(updated);
  } catch (err) { next(err); }
});

// PUT /api/settings (bulk update)
router.put("/", requirePermission("settings", "edit"), async (req, res, next) => {
  try {
    const updates = req.body as Array<{ key: string; value?: string; valueJson?: unknown }>;
    if (!Array.isArray(updates)) { res.status(400).json({ error: "يجب أن تكون البيانات مصفوفة" }); return; }
    const results = [];
    for (const upd of updates) {
      const [r] = await db.update(settings)
        .set({ value: upd.value, valueJson: upd.valueJson as any, updatedAt: new Date() as any, updatedBy: req.user!.sub as any })
        .where(eq(settings.key, upd.key)).returning();
      if (r) results.push(r);
    }
    res.json(results);
  } catch (err) { next(err); }
});

export default router;
