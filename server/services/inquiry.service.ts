import { and, desc, eq, isNull, sql, inArray, or, ilike } from 'drizzle-orm';
import { schema } from '../database/client';
import type { Ctx } from './auth.service';
import { audit } from './audit.service';
import { hit } from './rate-limit.service';
import { deliver, oneLine, type MailStatus } from './mail.service';
import { verifyTurnstile } from './bot.service';
import { hmac, safeEqual } from '../utils/crypto';
import { AppError, Errors } from '../utils/errors';
import { PROJECT_TYPE_LABELS, type RequestKind, type RequestStatus } from '../../shared/enums';
import type { AssessmentInput, InquiryInput, RequestListQuery } from '../../shared/schemas/inquiry';

const MIN_FILL_MS = 3_000;
const MAX_FORM_AGE_MS = 24 * 60 * 60_000;
const UPLOAD_TOKEN_TTL_MS = 60 * 60_000;

const orNull = <T>(v: T | '' | undefined): T | null => (v === '' || v === undefined ? null : v);

// ---- upload tokens: bind an upload to one saved request for one hour; no account needed ----
export function makeUploadToken(ctx: Ctx, requestId: string): string {
  const exp = Date.now() + UPLOAD_TOKEN_TTL_MS;
  return `${exp}.${hmac(ctx.env.SESSION_SECRET, `upload:${requestId}:${exp}`)}`;
}
export function checkUploadToken(ctx: Ctx, requestId: string, token: string | undefined): void {
  const [expStr, sig] = (token ?? '').split('.');
  const exp = Number(expStr);
  if (
    !sig ||
    !Number.isFinite(exp) ||
    exp < Date.now() ||
    !safeEqual(sig, hmac(ctx.env.SESSION_SECRET, `upload:${requestId}:${exp}`))
  ) {
    throw new AppError(
      403,
      'UPLOAD_TOKEN_INVALID',
      'This upload link has expired. Submit your request again or contact me directly.',
    );
  }
}

export type Created = { id: string; reference: string; uploadToken: string; emailStatus: MailStatus };
export type Submission = { created: Created } | { ignored: true };

/** Bots get no reference and no feedback; real people never trigger these paths. */
function looksAutomated(input: { website?: string | undefined; startedAt?: number | undefined }): boolean {
  if (input.website) return true;
  if (!input.startedAt) return true;
  const age = Date.now() - input.startedAt;
  return age < MIN_FILL_MS || age > MAX_FORM_AGE_MS;
}

async function guard(
  ctx: Ctx,
  input: {
    website?: string | undefined;
    startedAt?: number | undefined;
    turnstileToken?: string | undefined;
  },
  ip: string,
): Promise<boolean> {
  for (const [key, max, win] of [
    [`req:ip:h:${ctx.ipHash}`, 5, 3600],
    [`req:ip:d:${ctx.ipHash}`, 20, 86_400],
  ] as const) {
    const r = await hit(ctx.db, key, max, win);
    if (!r.allowed) throw Errors.rateLimited(r.retryAfterSec);
  }
  if (looksAutomated(input)) return false;
  await verifyTurnstile(ctx.env, input.turnstileToken, ip);
  return true;
}

async function nextReference(ctx: Ctx, kind: RequestKind): Promise<string> {
  const res = await ctx.db.execute(sql`select nextval('request_reference_seq')::text as n`);
  const n = Number((res.rows[0] as { n: string }).n);
  return `${kind === 'assessment' ? 'ASM' : 'INQ'}-${new Date().getUTCFullYear()}-${String(n).padStart(6, '0')}`;
}

async function findByIdempotency(ctx: Ctx, key: string) {
  const [row] = await ctx.db
    .select()
    .from(schema.projectRequests)
    .where(eq(schema.projectRequests.idempotencyKey, key));
  return row;
}

type Common = {
  fullName: string;
  email: string;
  organization?: string | undefined;
  phone?: string | undefined;
  country?: string | undefined;
};

async function adminEmails(ctx: Ctx): Promise<string[]> {
  const rows = await ctx.db
    .select({ email: schema.users.email })
    .from(schema.users)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
    .where(
      and(eq(schema.roles.name, 'admin'), eq(schema.users.status, 'active'), isNull(schema.users.deletedAt)),
    );
  return rows.map((r) => r.email);
}

/** Notifications never fail the submission: the request is already saved. The submitter's status is reported honestly. */
async function notify(
  ctx: Ctx,
  args: { id: string; reference: string; kind: RequestKind; contact: Common; summary: string },
): Promise<MailStatus> {
  const label = args.kind === 'assessment' ? 'system assessment request' : 'project inquiry';
  const status = await deliver(
    ctx,
    args.contact.email,
    'request_received',
    `I received your ${label} (${args.reference})`,
    `Hi ${oneLine(args.contact.fullName, 60)},\n\nI received your ${label}. Your reference number is ${args.reference}.\nI will reply to this email address after I have read it.\n\nPlease do not send passwords, API keys, or server credentials by email. If access is needed, I will arrange a secure method.\n`,
  );
  for (const to of await adminEmails(ctx)) {
    await deliver(
      ctx,
      to,
      'request_admin',
      `New ${label}: ${args.reference} from ${oneLine(args.contact.fullName, 60)}`,
      `${args.summary}\n\nOpen it: ${ctx.env.APP_URL}/admin/inquiries/${args.id}\n`,
    );
  }
  return status;
}

export async function createInquiry(
  ctx: Ctx,
  input: InquiryInput,
  opts: { ip: string; userId: string | null; idempotencyKey?: string | undefined },
): Promise<Submission> {
  if (!(await guard(ctx, input, opts.ip))) return { ignored: true };
  if (opts.idempotencyKey) {
    const existing = await findByIdempotency(ctx, opts.idempotencyKey);
    if (existing)
      return {
        created: {
          id: existing.id,
          reference: existing.reference,
          uploadToken: makeUploadToken(ctx, existing.id),
          emailStatus: 'sent',
        },
      };
  }
  const reference = await nextReference(ctx, 'inquiry');
  const clientId = opts.userId
    ? ((
        await ctx.db
          .select({ id: schema.clients.id })
          .from(schema.clients)
          .where(eq(schema.clients.userId, opts.userId))
      )[0]?.id ?? null)
    : null;
  let row: { id: string };
  try {
    [row] = (await ctx.db
      .insert(schema.projectRequests)
      .values({
        reference,
        kind: 'inquiry',
        clientId,
        contactName: input.fullName,
        contactEmail: input.email,
        organization: orNull(input.organization),
        phone: orNull(input.phone),
        country: orNull(input.country),
        industry: orNull(input.industry),
        path: input.path,
        projectType: input.projectType,
        hasExistingSystem: input.hasExistingSystem,
        currentTechnology: input.hasExistingSystem ? orNull(input.currentTechnology) : null,
        systemUrl: input.hasExistingSystem ? orNull(input.systemUrl) : null,
        description: input.description,
        mainProblems: orNull(input.mainProblems),
        requiredFeatures: orNull(input.requiredFeatures),
        expectedUsers: orNull(input.expectedUsers),
        budgetAmount: input.budgetAmount ?? null,
        budgetCurrency: input.budgetAmount !== undefined ? orNull(input.budgetCurrency) : null,
        timeline: orNull(input.timeline),
        priority: orNull(input.priority) ?? 'medium',
        additionalInfo: orNull(input.additionalInfo),
        consentAt: new Date(),
        ipHash: ctx.ipHash,
        idempotencyKey: opts.idempotencyKey ?? null,
      })
      .returning({ id: schema.projectRequests.id })) as [{ id: string }];
  } catch (e) {
    // Two parallel submits with the same idempotency key: return the winner, never a duplicate.
    const existing = opts.idempotencyKey ? await findByIdempotency(ctx, opts.idempotencyKey) : undefined;
    if (existing)
      return {
        created: {
          id: existing.id,
          reference: existing.reference,
          uploadToken: makeUploadToken(ctx, existing.id),
          emailStatus: 'sent',
        },
      };
    throw e;
  }
  await audit(ctx.db, {
    action: 'inquiry.created',
    actorId: opts.userId,
    entityType: 'project_request',
    entityId: row.id,
    after: { reference, kind: 'inquiry', path: input.path, projectType: input.projectType },
    ipHash: ctx.ipHash,
    requestId: ctx.requestId,
  });
  const emailStatus = await notify(ctx, {
    id: row.id,
    reference,
    kind: 'inquiry',
    contact: { fullName: input.fullName, email: input.email },
    summary: `${reference}\nFrom: ${oneLine(input.fullName)} <${input.email}>\nOrganization: ${oneLine(input.organization ?? '-')}\nType: ${PROJECT_TYPE_LABELS[input.projectType]}\nPath: ${input.path}\n\n${input.description.slice(0, 600)}`,
  });
  return { created: { id: row.id, reference, uploadToken: makeUploadToken(ctx, row.id), emailStatus } };
}

export async function createAssessment(
  ctx: Ctx,
  input: AssessmentInput,
  opts: { ip: string; userId: string | null; idempotencyKey?: string | undefined },
): Promise<Submission> {
  if (!(await guard(ctx, input, opts.ip))) return { ignored: true };
  if (opts.idempotencyKey) {
    const existing = await findByIdempotency(ctx, opts.idempotencyKey);
    if (existing)
      return {
        created: {
          id: existing.id,
          reference: existing.reference,
          uploadToken: makeUploadToken(ctx, existing.id),
          emailStatus: 'sent',
        },
      };
  }
  const reference = await nextReference(ctx, 'assessment');
  const clientId = opts.userId
    ? ((
        await ctx.db
          .select({ id: schema.clients.id })
          .from(schema.clients)
          .where(eq(schema.clients.userId, opts.userId))
      )[0]?.id ?? null)
    : null;
  const id = await ctx.db.transaction(async (tx) => {
    const [r] = await tx
      .insert(schema.projectRequests)
      .values({
        reference,
        kind: 'assessment',
        clientId,
        contactName: input.fullName,
        contactEmail: input.email,
        organization: orNull(input.organization),
        phone: orNull(input.phone),
        country: orNull(input.country),
        path: 'existing',
        projectType: 'system_modernization',
        hasExistingSystem: true,
        currentTechnology: orNull(input.technology),
        systemUrl: orNull(input.systemUrl),
        description: input.currentSystem,
        mainProblems: input.problems,
        expectedUsers: orNull(input.userCount),
        consentAt: new Date(),
        ipHash: ctx.ipHash,
        idempotencyKey: opts.idempotencyKey ?? null,
      })
      .returning({ id: schema.projectRequests.id });
    if (!r) throw new Error('insert failed');
    await tx.insert(schema.systemAssessments).values({
      requestId: r.id,
      currentSystem: input.currentSystem,
      technology: orNull(input.technology),
      originalDeveloper: orNull(input.originalDeveloper),
      problems: input.problems,
      isOnline: input.isOnline,
      featuresToImprove: orNull(input.featuresToImprove),
      errorsObserved: orNull(input.errorsObserved),
      userCount: orNull(input.userCount),
      databaseType: orNull(input.databaseType),
      hasSourceAccess: input.hasSourceAccess,
      hasServerAccess: input.hasServerAccess,
      hasDbAccess: input.hasDbAccess,
      desiredImprovements: input.desiredImprovements,
    });
    return r.id;
  });
  await audit(ctx.db, {
    action: 'inquiry.created',
    actorId: opts.userId,
    entityType: 'project_request',
    entityId: id,
    after: { reference, kind: 'assessment' },
    ipHash: ctx.ipHash,
    requestId: ctx.requestId,
  });
  const emailStatus = await notify(ctx, {
    id,
    reference,
    kind: 'assessment',
    contact: { fullName: input.fullName, email: input.email },
    summary: `${reference}\nFrom: ${oneLine(input.fullName)} <${input.email}>\nSystem: ${oneLine(input.currentSystem, 120)}\n\n${input.problems.slice(0, 600)}`,
  });
  return { created: { id, reference, uploadToken: makeUploadToken(ctx, id), emailStatus } };
}

export async function getRequestForUpload(ctx: Ctx, id: string) {
  const [row] = await ctx.db
    .select({ id: schema.projectRequests.id })
    .from(schema.projectRequests)
    .where(and(eq(schema.projectRequests.id, id), isNull(schema.projectRequests.deletedAt)));
  if (!row) throw Errors.notFound();
  return row;
}

// ---------------- admin inbox ----------------
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
const encodeCursor = (ts: string, id: string) => Buffer.from(`${ts}|${id}`).toString('base64url');
function decodeCursor(c: string): { ts: string; id: string } {
  const [ts, id] = Buffer.from(c, 'base64url').toString().split('|');
  if (!ts || !id || !/^[0-9a-f-]{36}$/i.test(id) || Number.isNaN(Date.parse(ts)))
    throw new AppError(422, 'VALIDATION_FAILED', 'Invalid cursor');
  return { ts, id };
}

export async function listRequests(ctx: Ctx, q: RequestListQuery) {
  const t = schema.projectRequests;
  const conds = [isNull(t.deletedAt)];
  if (q.status !== 'all') conds.push(eq(t.status, q.status));
  if (q.kind !== 'all') conds.push(eq(t.kind, q.kind));
  if (q.q) {
    const like = `%${escapeLike(q.q)}%`;
    conds.push(
      or(
        ilike(t.contactName, like),
        ilike(t.contactEmail, like),
        ilike(t.organization, like),
        ilike(t.reference, like),
        ilike(t.description, like),
      ) as ReturnType<typeof eq>,
    );
  }
  if (q.cursor) {
    const c = decodeCursor(q.cursor);
    conds.push(sql`(${t.createdAt}, ${t.id}) < (${c.ts}::timestamptz, ${c.id}::uuid)`);
  }
  const rows = await ctx.db
    .select({
      id: t.id,
      reference: t.reference,
      kind: t.kind,
      status: t.status,
      contactName: t.contactName,
      contactEmail: t.contactEmail,
      organization: t.organization,
      projectType: t.projectType,
      path: t.path,
      priority: t.priority,
      createdAt: t.createdAt,
      cursorTs: sql<string>`${t.createdAt}::text`,
    })
    .from(t)
    .where(and(...conds))
    .orderBy(desc(t.createdAt), desc(t.id))
    .limit(q.limit + 1);
  const page = rows.slice(0, q.limit);
  const last = page.at(-1);
  const counts = page.length
    ? await ctx.db
        .select({ requestId: schema.attachments.requestId, n: sql<number>`count(*)::int` })
        .from(schema.attachments)
        .where(
          and(
            inArray(
              schema.attachments.requestId,
              page.map((r) => r.id),
            ),
            isNull(schema.attachments.deletedAt),
          ),
        )
        .groupBy(schema.attachments.requestId)
    : [];
  const byReq = new Map(counts.map((c) => [c.requestId, c.n]));
  return {
    items: page.map(({ cursorTs: _c, ...r }) => ({ ...r, attachmentCount: byReq.get(r.id) ?? 0 })),
    nextCursor: rows.length > q.limit && last ? encodeCursor(last.cursorTs, last.id) : null,
  };
}

export async function statusCounts(ctx: Ctx): Promise<Record<string, number>> {
  const rows = await ctx.db
    .select({ status: schema.projectRequests.status, n: sql<number>`count(*)::int` })
    .from(schema.projectRequests)
    .where(isNull(schema.projectRequests.deletedAt))
    .groupBy(schema.projectRequests.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.n]));
}

export async function getRequest(ctx: Ctx, id: string) {
  const [request] = await ctx.db
    .select()
    .from(schema.projectRequests)
    .where(and(eq(schema.projectRequests.id, id), isNull(schema.projectRequests.deletedAt)));
  if (!request) throw Errors.notFound();
  const [assessment] = await ctx.db
    .select()
    .from(schema.systemAssessments)
    .where(eq(schema.systemAssessments.requestId, id));
  const files = await ctx.db
    .select({
      id: schema.attachments.id,
      originalName: schema.attachments.originalName,
      mime: schema.attachments.mime,
      sizeBytes: schema.attachments.sizeBytes,
      scanStatus: schema.attachments.scanStatus,
      createdAt: schema.attachments.createdAt,
    })
    .from(schema.attachments)
    .where(and(eq(schema.attachments.requestId, id), isNull(schema.attachments.deletedAt)));
  const { ipHash: _ip, idempotencyKey: _k, ...safe } = request;
  return { request: safe, assessment: assessment ?? null, attachments: files };
}

export async function updateRequest(
  ctx: Ctx,
  actor: { id: string },
  id: string,
  patch: { status?: RequestStatus | undefined; internalNotes?: string | undefined },
) {
  const [before] = await ctx.db
    .select()
    .from(schema.projectRequests)
    .where(and(eq(schema.projectRequests.id, id), isNull(schema.projectRequests.deletedAt)));
  if (!before) throw Errors.notFound();
  const set: Partial<typeof schema.projectRequests.$inferInsert> = { updatedAt: new Date() };
  if (patch.status !== undefined) set.status = patch.status;
  if (patch.internalNotes !== undefined) set.internalNotes = patch.internalNotes || null;
  await ctx.db.update(schema.projectRequests).set(set).where(eq(schema.projectRequests.id, id));
  await audit(ctx.db, {
    action: 'admin.inquiry.updated',
    actorId: actor.id,
    actorRole: 'admin',
    entityType: 'project_request',
    entityId: id,
    before: { status: before.status, notesChanged: patch.internalNotes !== undefined },
    after: { status: patch.status ?? before.status },
    ipHash: ctx.ipHash,
    requestId: ctx.requestId,
  });
}

export async function softDeleteRequest(ctx: Ctx, actor: { id: string }, id: string) {
  const res = await ctx.db
    .update(schema.projectRequests)
    .set({ deletedAt: new Date() })
    .where(and(eq(schema.projectRequests.id, id), isNull(schema.projectRequests.deletedAt)))
    .returning({ id: schema.projectRequests.id });
  if (!res.length) throw Errors.notFound();
  await audit(ctx.db, {
    action: 'admin.inquiry.deleted',
    actorId: actor.id,
    actorRole: 'admin',
    entityType: 'project_request',
    entityId: id,
    ipHash: ctx.ipHash,
    requestId: ctx.requestId,
  });
}

export async function getAttachmentForDownload(ctx: Ctx, id: string) {
  const [row] = await ctx.db
    .select({ a: schema.attachments })
    .from(schema.attachments)
    .innerJoin(schema.projectRequests, eq(schema.projectRequests.id, schema.attachments.requestId))
    .where(
      and(
        eq(schema.attachments.id, id),
        isNull(schema.attachments.deletedAt),
        isNull(schema.projectRequests.deletedAt),
      ),
    );
  if (!row) throw Errors.notFound();
  return row.a;
}
