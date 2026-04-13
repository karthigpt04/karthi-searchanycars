import { db, auditLogs } from "@searchanycars/db";

interface AuditParams {
  actorId: number;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Fire-and-forget audit log insertion.
 * Never blocks the request; failures are logged to stderr.
 */
export function logAudit(params: AuditParams): void {
  db.insert(auditLogs)
    .values({
      actorId: params.actorId,
      actorEmail: params.actorEmail,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId ?? null,
      details: params.details ?? {},
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    })
    .catch((err) => {
      console.error("[audit] Failed to write audit log:", err);
    });
}
