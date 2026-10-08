import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import * as auth from '../controllers/auth.controller';
import * as admin from '../controllers/admin.controller';
import * as intake from '../controllers/inquiry.controller';

export async function registerRoutes(app: FastifyInstance) {
  await app.register(
    async (api) => {
      api.get('/health', async () => ({ status: 'ok' }));
      api.get('/ready', async (req) => {
        await req.ctx.db.execute(sql`select 1`);
        return { status: 'ready' };
      });

      api.get('/auth/csrf', auth.csrf);
      api.post('/auth/register', auth.register);
      api.post('/auth/resend-verification', auth.resend);
      api.post('/auth/verify-email', auth.verifyEmail);
      api.post('/auth/login', auth.login);
      api.post('/auth/logout', auth.logout);
      api.get('/auth/me', auth.me);
      api.post('/auth/forgot-password', auth.forgot);
      api.post('/auth/reset-password', auth.reset);
      api.post('/auth/change-password', auth.changePassword);
      api.post('/auth/mfa/enroll', auth.mfaEnroll);
      api.post('/auth/mfa/enroll/confirm', auth.mfaEnrollConfirm);
      api.post('/auth/mfa/verify', auth.mfaVerify);

      api.get('/admin/users', admin.listUsers);
      api.post('/admin/users/:id/disable', admin.disableUser);
      api.get('/admin/activity-logs', admin.listActivity);

      api.post('/inquiries', intake.submitInquiry);
      api.post('/assessments', intake.submitAssessment);
      api.post('/inquiries/:id/attachments', { bodyLimit: 5 * 1024 * 1024 }, intake.uploadAttachment);

      api.get('/admin/inquiries', admin.inboxList);
      api.get('/admin/inquiries/:id', admin.inboxGet);
      api.patch('/admin/inquiries/:id', admin.inboxUpdate);
      api.delete('/admin/inquiries/:id', admin.inboxDelete);
      api.get('/admin/attachments/:id', admin.attachmentDownload);
    },
    { prefix: '/api/v1' },
  );
}
