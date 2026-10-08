import { schema } from '../database/client';
import { MailerError } from '../adapters/mailer';
import { AppError } from '../utils/errors';
import { hit } from './rate-limit.service';
import type { Ctx } from './auth.service';

/** Stay under Resend's free 100/day cap so a flood of requests cannot silently exhaust it. */
export const DAILY_MAIL_BUDGET = 90;

export type MailStatus = 'sent' | 'failed' | 'budget_exhausted';

/** Collapse to one line so user-supplied text can never inject extra lines into a subject. */
export const oneLine = (s: string, max = 80) =>
  s
    // eslint-disable-next-line no-control-regex -- stripping control characters (incl. CR/LF) is the purpose: it blocks header injection
    .replace(/[\r\n\t\u0000-\u001f\u007f]+/g, ' ')
    .trim()
    .slice(0, max);

/** Never throws. Records the outcome in the outbox so a failed notification is visible, not silent. */
export async function deliver(
  ctx: Ctx,
  to: string,
  template: string,
  subject: string,
  text: string,
): Promise<MailStatus> {
  const budget = await hit(ctx.db, 'mail:daily', DAILY_MAIL_BUDGET, 86_400);
  if (!budget.allowed) {
    await ctx.db
      .insert(schema.emailOutbox)
      .values({ toEmail: to, template, status: 'skipped_budget', transport: ctx.mailer.name });
    return 'budget_exhausted';
  }
  try {
    await ctx.mailer.send({ to, subject: oneLine(subject, 200), text });
    await ctx.db
      .insert(schema.emailOutbox)
      .values({ toEmail: to, template, status: 'sent', transport: ctx.mailer.name });
    return 'sent';
  } catch (e) {
    await ctx.db.insert(schema.emailOutbox).values({
      toEmail: to,
      template,
      status: 'failed',
      transport: ctx.mailer.name,
      error: e instanceof MailerError ? e.message : 'send failed',
    });
    return 'failed';
  }
}

/** For flows where the email IS the product (verification, reset): failure is surfaced to the user. */
export async function sendMail(
  ctx: Ctx,
  to: string,
  template: string,
  subject: string,
  text: string,
): Promise<void> {
  const status = await deliver(ctx, to, template, subject, text);
  if (status === 'budget_exhausted')
    throw new AppError(
      503,
      'EMAIL_BUDGET_EXHAUSTED',
      'Email sending is paused for today. Please try again tomorrow.',
    );
  if (status === 'failed')
    throw new AppError(
      503,
      'EMAIL_UNAVAILABLE',
      'The email could not be sent right now. Please try again shortly.',
    );
}
