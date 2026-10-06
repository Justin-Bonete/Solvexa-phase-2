import type { Env } from '../../env';

export type Mail = { to: string; subject: string; text: string };
export interface Mailer {
  readonly name: 'console-dev' | 'resend';
  send(mail: Mail): Promise<void>;
}

export class MailerError extends Error {}

/** DEV ONLY. Prints mail to the console and keeps it in memory for tests. Refused in production by env validation. */
export class ConsoleDevMailer implements Mailer {
  readonly name = 'console-dev' as const;
  readonly sent: Mail[] = [];
  async send(mail: Mail): Promise<void> {
    this.sent.push(mail);
    console.log(
      `\n[DEV MAILER - not a real email]\nTo: ${mail.to}\nSubject: ${mail.subject}\n${mail.text}\n`,
    );
  }
}

/** Real transport. Free tier is 3,000/month and 100/day: 429s surface as MailerError so callers can fail honestly. */
export class ResendMailer implements Mailer {
  readonly name = 'resend' as const;
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}
  async send(mail: Mail): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: this.from, to: [mail.to], subject: mail.subject, text: mail.text }),
    });
    if (!res.ok) throw new MailerError(`Resend responded ${res.status}`);
  }
}

export function createMailer(env: Env): Mailer {
  return env.MAIL_TRANSPORT === 'resend'
    ? new ResendMailer(env.RESEND_API_KEY ?? '', env.MAIL_FROM)
    : new ConsoleDevMailer();
}
