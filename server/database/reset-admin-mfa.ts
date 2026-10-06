import { createDb, requireDatabaseUrl } from './client';
import { resetAdminMfa } from '../services/totp.service';

const email = process.argv[2];
if (!email) throw new Error('Usage: npm run admin:reset-mfa -- admin@example.com');
const url = requireDatabaseUrl();
const ok = await resetAdminMfa(createDb(url), email);
console.log(
  ok
    ? `MFA reset for ${email}. They must enroll again at next sign-in.`
    : 'No admin account found for that email. Nothing changed.',
);
process.exit(ok ? 0 : 1);
