import { Router } from "express";
import { db } from "@workspace/db";
import { notifications } from "@workspace/db/schema";
import { eq, and, count, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { parsePagination, paginate } from "../lib/pagination";

const router = Router();
router.use(requireAuth);

// GET /api/notifications — current user's notifications
router.get("/", async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const userId = req.user!.sub;
    const [items, [{ total }], [{ unread }]] = await Promise.all([
      db.select().from(notifications).where(eq(notifications.recipientId, userId as any))
        .limit(limit).offset(offset).orderBy(desc(notifications.createdAt)),
      db.select({ total: count() }).from(notifications).where(eq(notifications.recipientId, userId as any)),
      db.select({ unread: count() }).from(notifications)
        .where(and(eq(notifications.recipientId, userId as any), eq(notifications.isRead, false))),
    ]);
    res.json({ ...paginate(items, Number(total), { page, limit, offset }), unreadCount: Number(unread) });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", async (req, res, next) => {
  try {
    const [updated] = await db.update(notifications)
      .set({ isRead: true, readAt: new Date() as any })
      .where(and(eq(notifications.id, req.params.id), eq(notifications.recipientId, req.user!.sub as any)))
      .returning();
    if (!updated) { res.status(404).json({ error: "الإشعار غير موجود" }); return; }
    res.json(updated);
  } catch (err) { next(err); }
});

// PATCH /api/notifications/read-all
router.patch("/read-all", async (req, res, next) => {
  try {
    await db.update(notifications)
      .set({ isRead: true, readAt: new Date() as any })
      .where(and(eq(notifications.recipientId, req.user!.sub as any), eq(notifications.isRead, false)));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
