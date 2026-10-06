import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);

/** Length-based policy per NIST 800-63B: long, no composition rules. */
export const password = z
  .string()
  .min(12, 'Use at least 12 characters')
  .max(128, 'Use 128 characters or fewer');

const fullName = z.string().trim().min(2, 'Enter your full name').max(120);
const token = z.string().min(20).max(200);

export const registerInput = z
  .object({
    fullName,
    email,
    password,
    organization: z.string().trim().max(160).optional(),
    consent: z.literal(true, { errorMap: () => ({ message: 'Accept the privacy notice to continue' }) }),
    /** Honeypot: real users never see or fill this. */
    website: z.string().max(200).optional(),
    turnstileToken: z.string().max(2048).optional(),
  })
  .strict();
export type RegisterInput = z.infer<typeof registerInput>;

export const loginInput = z.object({ email, password: z.string().min(1).max(128) }).strict();
export type LoginInput = z.infer<typeof loginInput>;

export const verifyEmailInput = z.object({ token }).strict();
export const resendVerificationInput = z.object({ email }).strict();
export const forgotPasswordInput = z.object({ email }).strict();
export const resetPasswordInput = z.object({ token, password }).strict();
export const changePasswordInput = z
  .object({ currentPassword: z.string().min(1).max(128), newPassword: password })
  .strict();

export const totpCode = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code');
export const mfaVerifyInput = z.object({ code: z.string().trim().min(6).max(24) }).strict();
export const mfaEnrollConfirmInput = z.object({ code: totpCode }).strict();

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'client';
  status: 'pending_verification' | 'active' | 'disabled';
  emailVerified: boolean;
  /** Admins must enroll in TOTP; until then only mfa endpoints work. */
  mfa: 'not_required' | 'enrollment_required' | 'verification_required' | 'verified';
};
