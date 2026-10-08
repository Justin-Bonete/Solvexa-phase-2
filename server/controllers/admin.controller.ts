import type { FastifyReply, FastifyRequest } from 'fastify';
import { desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { schema } from '../database/client';
import { authorize } from '../middleware/security';
import { AppError, parse } from '../utils/errors';
import { audit } from '../services/audit.service';
import { revokeAllForUser } from '../services/session.service';
import {
  getAttachmentForDownload,
  getRequest,
  listRequests,
  softDeleteRequest,
  statusCounts,
  updateRequest,
} from '../services/inquiry.service';
import { requestListQuery, requestUpdateInput, uuidParam } from '../../shared/schemas/inquiry';

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

// ---------------- inbox ----------------
export async function inboxList(req: FastifyRequest) {
  authorize(req, 'inquiries', 'read');
  const q = parse(requestListQuery, req.query);
  const [list, counts] = await Promise.all([listRequests(req.ctx, q), statusCounts(req.ctx)]);
  return { ...list, counts };
}

export async function inboxGet(req: FastifyRequest) {
  authorize(req, 'inquiries', 'read');
  return getRequest(req.ctx, parse(uuidParam, req.params).id);
}

export async function inboxUpdate(req: FastifyRequest) {
  const a = authorize(req, 'inquiries', 'update');
  const { id } = parse(uuidParam, req.params);
  await updateRequest(req.ctx, { id: a.user.id }, id, parse(requestUpdateInput, req.body));
  return { ok: true };
}

export async function inboxDelete(req: FastifyRequest) {
  const a = authorize(req, 'inquiries', 'delete');
  await softDeleteRequest(req.ctx, { id: a.user.id }, parse(uuidParam, req.params).id);
  return { ok: true };
}

/** Streams a stored file only after the admin check. Always an attachment, never rendered by the browser. */
export async function attachmentDownload(req: FastifyRequest, reply: FastifyReply) {
  const a = authorize(req, 'attachments', 'read');
  const file = await getAttachmentForDownload(req.ctx, parse(uuidParam, req.params).id);
  const data = await req.ctx.storage.get(file.storageKey);
  if (!data) throw new AppError(404, 'NOT_FOUND', 'The file is missing from storage.');
  await audit(req.ctx.db, {
    action: 'admin.attachment.downloaded',
    actorId: a.user.id,
    actorRole: 'admin',
    entityType: 'attachment',
    entityId: file.id,
    ipHash: req.ctx.ipHash,
    requestId: req.ctx.requestId,
  });
  const ascii = file.originalName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return reply
    .header('Content-Type', file.mime)
    .header(
      'Content-Disposition',
      `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.originalName).replace(/['()*!]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`,
    )
    .header('X-Content-Type-Options', 'nosniff')
    .header('Content-Security-Policy', "default-src 'none'; sandbox")
    .send(data);
}
