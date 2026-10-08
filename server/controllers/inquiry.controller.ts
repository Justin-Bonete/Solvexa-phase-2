import type { FastifyReply, FastifyRequest } from 'fastify';
import { assessmentInput, inquiryInput, uuidParam } from '../../shared/schemas/inquiry';
import { MAX_FILE_BYTES } from '../../shared/uploads';
import { AppError, Errors, parse } from '../utils/errors';
import {
  checkUploadToken,
  createAssessment,
  createInquiry,
  getRequestForUpload,
  type Submission,
} from '../services/inquiry.service';
import { storeAttachment } from '../services/upload.service';
import { hit } from '../services/rate-limit.service';

const IDEM = /^[A-Za-z0-9_-]{16,64}$/;
function idempotencyKey(req: FastifyRequest): string | undefined {
  const h = req.headers['idempotency-key'];
  if (h === undefined) return undefined;
  if (typeof h !== 'string' || !IDEM.test(h))
    throw new AppError(422, 'VALIDATION_FAILED', 'Invalid Idempotency-Key');
  return h;
}
const userId = (req: FastifyRequest) =>
  req.auth && req.auth.user.status === 'active' ? req.auth.user.id : null;

function respond(reply: FastifyReply, res: Submission) {
  // Automated submissions get a bare 202 with no reference, so nothing is ever confirmed that was not saved.
  if ('ignored' in res) return reply.code(202).send({ ok: true });
  return reply.code(201).send({ ok: true, ...res.created });
}

export async function submitInquiry(req: FastifyRequest, reply: FastifyReply) {
  const input = parse(inquiryInput, req.body);
  return respond(
    reply,
    await createInquiry(req.ctx, input, {
      ip: req.ip_raw,
      userId: userId(req),
      idempotencyKey: idempotencyKey(req),
    }),
  );
}

export async function submitAssessment(req: FastifyRequest, reply: FastifyReply) {
  const input = parse(assessmentInput, req.body);
  return respond(
    reply,
    await createAssessment(req.ctx, input, {
      ip: req.ip_raw,
      userId: userId(req),
      idempotencyKey: idempotencyKey(req),
    }),
  );
}

export async function uploadAttachment(req: FastifyRequest, reply: FastifyReply) {
  const { id } = parse(uuidParam, req.params);
  const token = req.headers['x-upload-token'];
  checkUploadToken(req.ctx, id, typeof token === 'string' ? token : undefined);
  const r = await hit(req.ctx.db, `upload:ip:${req.ctx.ipHash}`, 30, 3600);
  if (!r.allowed) throw Errors.rateLimited(r.retryAfterSec);
  const request = await getRequestForUpload(req.ctx, id);

  if (!req.isMultipart())
    throw new AppError(415, 'UNSUPPORTED_MEDIA', 'Send the file as multipart/form-data.');
  const part = await req.file({ limits: { fileSize: MAX_FILE_BYTES, files: 1 } });
  if (!part) throw new AppError(422, 'VALIDATION_FAILED', 'No file was sent.');
  let data: Buffer;
  try {
    data = await part.toBuffer();
  } catch {
    throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'The file is too large.');
  }
  if (part.file.truncated) throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'The file is too large.');

  const saved = await storeAttachment(req.ctx, request, { filename: part.filename, data }, userId(req));
  return reply.code(201).send({ ok: true, attachment: saved });
}
