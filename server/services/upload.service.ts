import { createHash, randomUUID } from 'node:crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { fileTypeFromBuffer } from 'file-type';
import { schema } from '../database/client';
import type { Ctx } from './auth.service';
import { audit } from './audit.service';
import { newStorageKey } from '../adapters/storage';
import { AppError } from '../utils/errors';
import {
  MAX_FILE_BYTES,
  MAX_FILES_PER_REQUEST,
  TEXT_EXTENSIONS,
  UPLOAD_TYPES,
  extensionOf,
  type UploadExt,
} from '../../shared/uploads';

export type IncomingFile = { filename: string; data: Buffer };

/** Display-only name: no path parts, no control or bidi characters, bounded length. */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'file';
  const cleaned = base
    // eslint-disable-next-line no-control-regex -- stripping control characters is the purpose of this expression
    .replace(/[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return cleaned || 'file';
}

const reject = (message: string, code = 'UPLOAD_REJECTED') => new AppError(422, code, message);

/** Plain text must be valid UTF-8 with no NUL or other control bytes (binary disguised as text). */
function isCleanText(buf: Buffer): boolean {
  try {
    const t = new TextDecoder('utf-8', { fatal: true }).decode(buf);
    // eslint-disable-next-line no-control-regex -- detecting control bytes is the purpose of this expression
    return !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(t);
  } catch {
    return false;
  }
}

/**
 * The real enforcement (client checks are only for early feedback): extension allowlist, size, and content verification
 * by magic bytes. A file must BE what its extension claims, and anything that is not on the allowlist is refused.
 */
export async function verifyFile(file: IncomingFile): Promise<{ ext: UploadExt; mime: string }> {
  const ext = extensionOf(file.filename) as UploadExt;
  if (!(ext in UPLOAD_TYPES)) throw reject('This file type is not allowed.', 'UPLOAD_TYPE_NOT_ALLOWED');
  if (file.data.length === 0) throw reject('The file is empty.');
  if (file.data.length > MAX_FILE_BYTES)
    throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'The file is too large.');

  const detected = await fileTypeFromBuffer(file.data);
  if (TEXT_EXTENSIONS.includes(ext)) {
    if (detected) throw reject('The file content does not match its extension.', 'UPLOAD_CONTENT_MISMATCH');
    if (!isCleanText(file.data))
      throw reject('The file content does not match its extension.', 'UPLOAD_CONTENT_MISMATCH');
    return { ext, mime: UPLOAD_TYPES[ext] };
  }
  if (!detected || detected.mime !== UPLOAD_TYPES[ext])
    throw reject('The file content does not match its extension.', 'UPLOAD_CONTENT_MISMATCH');
  return { ext, mime: UPLOAD_TYPES[ext] };
}

export async function storeAttachment(
  ctx: Ctx,
  request: { id: string },
  file: IncomingFile,
  uploadedBy: string | null,
) {
  const { mime } = await verifyFile(file);

  const [{ n } = { n: 0 }] = await ctx.db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.attachments)
    .where(and(eq(schema.attachments.requestId, request.id), isNull(schema.attachments.deletedAt)));
  if (n >= MAX_FILES_PER_REQUEST)
    throw new AppError(409, 'TOO_MANY_FILES', `You can attach up to ${MAX_FILES_PER_REQUEST} files.`);

  const key = newStorageKey(`requests/${request.id}`);
  const sha256 = createHash('sha256').update(file.data).digest('hex');
  try {
    await ctx.storage.put(key, file.data, mime);
  } catch {
    throw new AppError(
      503,
      'UPLOADS_UNAVAILABLE',
      'File uploads are unavailable right now. Your request was saved; try the upload again shortly.',
    );
  }
  try {
    const [row] = await ctx.db
      .insert(schema.attachments)
      .values({
        id: randomUUID(),
        requestId: request.id,
        storageKey: key,
        originalName: sanitizeFilename(file.filename),
        mime,
        sizeBytes: file.data.length,
        sha256,
        uploadedBy,
      })
      .returning({
        id: schema.attachments.id,
        originalName: schema.attachments.originalName,
        sizeBytes: schema.attachments.sizeBytes,
      });
    await audit(ctx.db, {
      action: 'inquiry.attachment.uploaded',
      actorId: uploadedBy,
      entityType: 'project_request',
      entityId: request.id,
      after: { size: file.data.length, mime },
      ipHash: ctx.ipHash,
      requestId: ctx.requestId,
    });
    return row;
  } catch (e) {
    await ctx.storage.delete(key).catch(() => undefined); // do not leave an orphaned file behind
    throw e;
  }
}
