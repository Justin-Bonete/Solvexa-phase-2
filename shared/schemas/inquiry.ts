import { z } from 'zod';
import {
  ACCESS_STATES,
  CURRENCIES,
  ONLINE_STATUSES,
  PRIORITIES,
  PROJECT_TYPES,
  REQUEST_KINDS,
  REQUEST_PATHS,
  REQUEST_STATUSES,
  TIMELINES,
  USER_BANDS,
} from '../enums';

const text = (max: number) => z.string().trim().max(max, `Use ${max} characters or fewer`);
/** Optional text: the form sends '' for untouched fields; the server stores '' as null. */
const optText = (max: number) => text(max).optional();
const optEnum = <T extends readonly [string, ...string[]]>(vals: T) =>
  z.enum(vals).or(z.literal('')).optional();

const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);
const phone = z
  .string()
  .trim()
  .max(40)
  .regex(/^[0-9+()\-.\s]*$/, 'Use digits, spaces, and + ( ) - only')
  .optional();
const httpUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => v === '' || /^https?:\/\/[^\s]+$/i.test(v),
    'Enter a full address starting with http:// or https://',
  )
  .optional();

const contact = {
  fullName: z.string().trim().min(2, 'Enter your full name').max(120),
  organization: optText(160),
  email,
  phone,
  country: optText(80),
};
const antiSpam = {
  consent: z.literal(true, { errorMap: () => ({ message: 'Accept the privacy notice to continue' }) }),
  /** Honeypot: real users never see or fill this. */
  website: z.string().max(200).optional(),
  /** Epoch ms when the form was shown; submissions faster than a human could type are treated as bots. */
  startedAt: z.number().int().optional(),
  turnstileToken: z.string().max(2048).optional(),
};

export const inquiryInput = z
  .object({
    path: z.enum(REQUEST_PATHS),
    ...contact,
    industry: optText(120),
    projectType: z.enum(PROJECT_TYPES, { errorMap: () => ({ message: 'Choose the closest project type' }) }),
    hasExistingSystem: z.boolean(),
    currentTechnology: optText(300),
    systemUrl: httpUrl,
    description: z
      .string()
      .trim()
      .min(20, 'Describe what you need in at least 20 characters')
      .max(5000, 'Use 5,000 characters or fewer'),
    mainProblems: optText(3000),
    requiredFeatures: optText(3000),
    expectedUsers: optEnum(USER_BANDS),
    budgetAmount: z
      .number({ invalid_type_error: 'Enter a number' })
      .int('Use a whole number')
      .min(0)
      .max(1_000_000_000)
      .optional(),
    budgetCurrency: optEnum(CURRENCIES),
    timeline: optEnum(TIMELINES),
    priority: optEnum(PRIORITIES),
    additionalInfo: optText(3000),
    ...antiSpam,
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.budgetAmount !== undefined && !v.budgetCurrency)
      ctx.addIssue({ code: 'custom', path: ['budgetCurrency'], message: 'Choose a currency' });
    if (v.path === 'existing' && !v.hasExistingSystem)
      ctx.addIssue({
        code: 'custom',
        path: ['hasExistingSystem'],
        message: 'This path is for existing systems',
      });
  });
export type InquiryInput = z.infer<typeof inquiryInput>;

export const assessmentInput = z
  .object({
    ...contact,
    currentSystem: z.string().trim().min(3, 'Name or describe the system').max(300),
    technology: optText(300),
    originalDeveloper: optText(200),
    systemUrl: httpUrl,
    problems: z.string().trim().min(10, 'Describe the problems in at least 10 characters').max(4000),
    isOnline: z.enum(ONLINE_STATUSES, { errorMap: () => ({ message: 'Choose one' }) }),
    featuresToImprove: optText(3000),
    errorsObserved: optText(3000),
    userCount: optEnum(USER_BANDS),
    databaseType: optText(200),
    hasSourceAccess: z.enum(ACCESS_STATES, { errorMap: () => ({ message: 'Choose one' }) }),
    hasServerAccess: z.enum(ACCESS_STATES, { errorMap: () => ({ message: 'Choose one' }) }),
    hasDbAccess: z.enum(ACCESS_STATES, { errorMap: () => ({ message: 'Choose one' }) }),
    desiredImprovements: z
      .string()
      .trim()
      .min(10, 'Describe what you want improved (at least 10 characters)')
      .max(4000),
    ...antiSpam,
  })
  .strict();
export type AssessmentInput = z.infer<typeof assessmentInput>;

export const requestListQuery = z
  .object({
    status: z.enum([...REQUEST_STATUSES, 'all']).default('all'),
    kind: z.enum([...REQUEST_KINDS, 'all']).default('all'),
    q: z.string().trim().max(100).default(''),
    limit: z.coerce.number().int().min(1).max(50).default(25),
    cursor: z.string().max(200).optional(),
  })
  .strict();
export type RequestListQuery = z.infer<typeof requestListQuery>;

export const requestUpdateInput = z
  .object({ status: z.enum(REQUEST_STATUSES).optional(), internalNotes: z.string().max(5000).optional() })
  .strict()
  .refine((v) => v.status !== undefined || v.internalNotes !== undefined, 'Nothing to update');

export const uuidParam = z.object({ id: z.string().uuid() }).strict();
