import { db } from "@workspace/db";
import { auditLogs } from "@workspace/db/schema";
import type { Request } from "express";

type AuditAction =
  | "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT"
  | "STATUS_CHANGE" | "PERMISSION_GRANT" | "PERMISSION_REVOKE"
  | "POST" | "REVERSE";

export async function writeAuditLog(params: {
  req?: Request;
  entityType: string;
  entityId?: string;
  action: AuditAction;
  before?: unknown;
  after?: unknown;
  note?: string;
}) {
  try {
    const actor = (params.req as any)?.user;
    await db.insert(auditLogs).values({
      entityType: params.entityType,
      entityId: params.entityId as any,
      action: params.action,
      actorId: actor?.sub as any,
      actorUsername: actor?.username,
      before: params.before as any,
      after: params.after as any,
      note: params.note,
      ipAddress: params.req?.ip,
      requestId: (params.req as any)?.id?.toString(),
    });
  } catch {
    // audit failure should never break the main flow
  }
}
