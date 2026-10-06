import type { Db } from '../database/client';
import { schema } from '../database/client';
import type { AuditAction } from '../../shared/enums';

export type AuditEntry = {
  action: AuditAction;
  actorId?: string | null;
  actorRole?: string | null;
  entityType?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ipHash?: string | null;
  requestId?: string | null;
};

/** Never pass secrets in before/after; callers pass only safe fields. */
export async function audit(db: Db, e: AuditEntry): Promise<void> {
  await db.insert(schema.activityLogs).values({
    action: e.action,
    actorId: e.actorId ?? null,
    actorRole: e.actorRole ?? null,
    entityType: e.entityType ?? null,
    entityId: e.entityId ?? null,
    before: e.before ?? null,
    after: e.after ?? null,
    ipHash: e.ipHash ?? null,
    requestId: e.requestId ?? null,
  });
}
