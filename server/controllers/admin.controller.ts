import type { FastifyRequest } from 'fastify';
import { desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { schema } from '../database/client';
import { authorize } from '../middleware/security';
import { AppError, parse } from '../utils/errors';
import { audit } from '../services/audit.service';
import { revokeAllForUser } from '../services/session.service';

export async function listUsers(req: FastifyRequest) {
  authorize(req, 'users', 'read');
  const rows = await req.ctx.db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      fullName: schema.users.fullName,
      status: schema.users.status,
      role: schema.roles.name,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
    .where(isNull(schema.users.deletedAt))
    .orderBy(desc(schema.users.createdAt))
    .limit(100);
  return { users: rows };
}

const idParam = z.object({ id: z.string().uuid() }).strict();

export async function disableUser(req: FastifyRequest) {
  const a = authorize(req, 'users', 'disable');
  const { id } = parse(idParam, req.params);
  if (id === a.user.id) throw new AppError(409, 'CONFLICT', 'You cannot disable your own account.');
  const [target] = await req.ctx.db.select().from(schema.users).where(eq(schema.users.id, id));
  if (!target || target.deletedAt) throw new AppError(404, 'NOT_FOUND', 'Not found.');
  await req.ctx.db
    .update(schema.users)
    .set({ status: 'disabled', updatedAt: new Date() })
    .where(eq(schema.users.id, id));
  await revokeAllForUser(req.ctx.db, id);
  await audit(req.ctx.db, {
    action: 'admin.user.disabled',
    actorId: a.user.id,
    actorRole: 'admin',
    entityType: 'user',
    entityId: id,
    before: { status: target.status },
    after: { status: 'disabled' },
    ipHash: req.ctx.ipHash,
    requestId: req.ctx.requestId,
  });
  return { ok: true };
}

export async function listActivity(req: FastifyRequest) {
  authorize(req, 'activity_logs', 'read');
  const rows = await req.ctx.db
    .select()
    .from(schema.activityLogs)
    .orderBy(desc(schema.activityLogs.createdAt))
    .limit(100);
  return { logs: rows };
}
