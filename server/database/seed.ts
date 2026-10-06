import { eq } from 'drizzle-orm';
import { createDb, requireDatabaseUrl, schema } from './client';
import { hashPassword } from '../services/password.service';
import { ROLES } from '../../shared/enums';

/** Seeds roles and, if ADMIN_EMAIL + ADMIN_PASSWORD are set, one admin. No default credentials exist. */
const url = requireDatabaseUrl();
const db = createDb(url);

for (const name of ROLES)
  await db
    .insert(schema.roles)
    .values({ name, description: `${name} role` })
    .onConflictDoNothing();

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const pw = process.env.ADMIN_PASSWORD;
if (email && pw) {
  if (pw.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters');
  const [role] = await db.select().from(schema.roles).where(eq(schema.roles.name, 'admin'));
  if (!role) throw new Error('admin role missing');
  await db
    .insert(schema.users)
    .values({
      email,
      passwordHash: await hashPassword(pw),
      roleId: role.id,
      fullName: process.env.ADMIN_NAME ?? 'Admin',
      status: 'active',
      emailVerifiedAt: new Date(),
    })
    .onConflictDoNothing();
  console.log(`Admin ensured: ${email}. TOTP enrollment is required at first login.`);
} else {
  console.log('Roles seeded. Set ADMIN_EMAIL and ADMIN_PASSWORD to create an admin.');
}
process.exit(0);
