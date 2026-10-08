import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { credentialsWarning } from '@content/site.config';
import {
  CURRENCIES,
  PRIORITIES,
  PRIORITY_LABELS,
  PROJECT_TYPES,
  PROJECT_TYPE_LABELS,
  TIMELINES,
  TIMELINE_LABELS,
  USER_BANDS,
  USER_BAND_LABELS,
  type ProjectType,
  type RequestPath,
} from '@shared/enums';
import { inquiryInput, type InquiryInput } from '@shared/schemas/inquiry';
import { Alert } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { Checkbox, SegmentedControl } from '@/components/ui/Form';
import { FormSection, SelectField, TextAreaField, TextField } from '@/components/ui/Fields';
import { FileDropzone } from '@/components/ui/FileDropzone';
import { Turnstile } from '@/components/ui/Turnstile';
import { Confirmation } from './Confirmation';
import { useDraft } from './useDraft';
import { useSubmit } from './useSubmit';

type PathConfig = {
  title: string;
  lead: string;
  hasSystem: boolean;
  projectType?: ProjectType;
  show: {
    industry: boolean;
    users: boolean;
    budget: boolean;
    timeline: boolean;
    priority: boolean;
    features: boolean;
    extra: boolean;
    projectType: boolean;
  };
};

/** Each path asks a different set of questions. Hidden fields are neither shown nor sent. */
export const PATH_CONFIG: Record<RequestPath, PathConfig> = {
  new: {
    title: 'Tell me about the system you need',
    lead: 'The more I understand about who will use it and what it must do, the better my first reply will be.',
    hasSystem: false,
    show: {
      industry: true,
      users: true,
      budget: true,
      timeline: true,
      priority: true,
      features: true,
      extra: true,
      projectType: true,
    },
  },
  existing: {
    title: 'Tell me about your existing system',
    lead: 'Describe what you have and what is going wrong or missing. For a deeper technical review, you can also use the system assessment form.',
    hasSystem: true,
    show: {
      industry: true,
      users: true,
      budget: true,
      timeline: true,
      priority: true,
      features: true,
      extra: true,
      projectType: true,
    },
  },
  idea: {
    title: 'Tell me about your idea',
    lead: 'It does not need to be fully formed. Describe what you are imagining and I will help work out the next step.',
    hasSystem: false,
    projectType: 'other',
    show: {
      industry: false,
      users: false,
      budget: true,
      timeline: true,
      priority: false,
      features: false,
      extra: true,
      projectType: false,
    },
  },
};

export function InquiryForm({ path }: { path: RequestPath }) {
  const cfg = PATH_CONFIG[path];
  const form = useForm<InquiryInput>({
    resolver: zodResolver(inquiryInput),
    mode: 'onTouched',
    defaultValues: {
      path,
      hasExistingSystem: cfg.hasSystem,
      ...(cfg.projectType ? { projectType: cfg.projectType } : {}),
      budgetCurrency: 'PHP',
    } as Partial<InquiryInput> as InquiryInput,
  });
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    getValues,
  } = form;
  const [files, setFiles] = useState<File[]>([]);
  const [confirmedEmail, setConfirmedEmail] = useState('');
  const flow = useSubmit<InquiryInput>('/inquiries', setError);
  const draft = useDraft(`solvexa:draft:v1:inquiry:${path}`, form, !flow.created);
  const hasSystem = watch('hasExistingSystem');
  const idPrefix = useMemo(() => path, [path]);

  const onSubmit = handleSubmit(async (values) => {
    const payload: Record<string, unknown> = { ...values };
    if (!values.hasExistingSystem)
      for (const k of ['currentTechnology', 'systemUrl', 'mainProblems']) delete payload[k];
    if (values.budgetAmount === undefined) delete payload.budgetCurrency;
    const res = await flow.submit(payload);
    if (res) {
      setConfirmedEmail(values.email);
      draft.clear();
    }
  });

  if (flow.created) {
    return (
      <Confirmation
        created={flow.created}
        email={confirmedEmail}
        files={files}
        onReset={() => {
          flow.reset();
          setFiles([]);
          form.reset();
        }}
      />
    );
  }

  const e = errors;
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-10" aria-labelledby={`${idPrefix}-title`}>
      <header>
        <h2 id={`${idPrefix}-title`} className="text-h2">
          {cfg.title}
        </h2>
        <p className="mt-2 max-w-prose text-muted">{cfg.lead}</p>
        <p className="mt-3 text-sm text-faint" role="status">
          {draft.state === 'restored' && 'I restored your saved draft from this device. '}
          {draft.state === 'saved' && 'Draft saved on this device only. '}
          {draft.state === 'unavailable' && 'Your browser blocked draft saving, so keep this tab open. '}
          {(draft.state === 'restored' || draft.state === 'saved') && (
            <button
              type="button"
              onClick={() => {
                draft.clear();
                form.reset();
              }}
              className="underline underline-offset-4 hover:text-fg"
            >
              Clear draft
            </button>
          )}
        </p>
      </header>

      {flow.error && (
        <Alert tone="danger" title="Your request was not sent">
          {flow.error}
        </Alert>
      )}

      <FormSection title="About you">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Full name"
            required
            autoComplete="name"
            error={e.fullName?.message}
            {...register('fullName')}
          />
          <TextField
            label="Email"
            required
            type="email"
            inputMode="email"
            autoComplete="email"
            error={e.email?.message}
            {...register('email')}
          />
          <TextField
            label="Company or organization"
            autoComplete="organization"
            error={e.organization?.message}
            {...register('organization')}
          />
          <TextField
            label="Phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            error={e.phone?.message}
            {...register('phone')}
          />
          <TextField
            label="Country"
            autoComplete="country-name"
            error={e.country?.message}
            {...register('country')}
          />
          {cfg.show.industry && (
            <TextField
              label="Industry"
              hint="For example: retail, education, government"
              error={e.industry?.message}
              {...register('industry')}
            />
          )}
        </div>
      </FormSection>

      <FormSection title="Your project">
        <SegmentedControl
          legend="Do you already have a system?"
          value={hasSystem ? 'yes' : 'no'}
          onChange={(v) => setValue('hasExistingSystem', v === 'yes', { shouldDirty: true })}
          options={[
            { value: 'no', label: 'I need a new system' },
            { value: 'yes', label: 'I already have a system' },
          ]}
        />
        {cfg.show.projectType && (
          <SelectField
            label="Project type"
            required
            error={e.projectType?.message}
            {...register('projectType')}
          >
            {PROJECT_TYPES.map((t) => (
              <option key={t} value={t}>
                {PROJECT_TYPE_LABELS[t]}
              </option>
            ))}
          </SelectField>
        )}
        <TextAreaField
          label={path === 'idea' ? 'Your idea' : 'What do you need?'}
          required
          rows={6}
          hint="What should it do, and who will use it?"
          error={e.description?.message}
          {...register('description')}
        />

        {hasSystem && (
          <div className="space-y-5 rounded-lg border border-line bg-s1 p-5">
            <h3 className="text-lg font-semibold">About your existing system</h3>
            <Alert tone="warning" title="Do not send credentials">
              {credentialsWarning}
            </Alert>
            <TextField
              label="Current technology"
              hint="For example: PHP 5, WordPress, Excel. If you do not know, say so."
              error={e.currentTechnology?.message}
              {...register('currentTechnology')}
            />
            <TextField
              label="System address (URL)"
              type="url"
              inputMode="url"
              placeholder="https://"
              error={e.systemUrl?.message}
              {...register('systemUrl')}
            />
            <TextAreaField
              label="Main problems"
              rows={4}
              hint="Errors, slowness, missing features, or anything else that hurts today."
              error={e.mainProblems?.message}
              {...register('mainProblems')}
            />
            {path !== 'existing' ? null : (
              <p className="text-sm text-muted">
                Want to share more technical detail?{' '}
                <Link to="/assessment" className="text-accent underline-offset-4 hover:underline">
                  Use the system assessment form
                </Link>
                .
              </p>
            )}
          </div>
        )}

        {cfg.show.features && (
          <TextAreaField
            label="Required features"
            rows={4}
            hint="List the things it must do."
            error={e.requiredFeatures?.message}
            {...register('requiredFeatures')}
          />
        )}
        {cfg.show.users && (
          <SelectField
            label="Expected number of users"
            error={e.expectedUsers?.message}
            {...register('expectedUsers')}
          >
            {USER_BANDS.map((b) => (
              <option key={b} value={b}>
                {USER_BAND_LABELS[b]}
              </option>
            ))}
          </SelectField>
        )}
      </FormSection>

      {(cfg.show.budget || cfg.show.timeline || cfg.show.priority) && (
        <FormSection title="Budget and timing">
          {cfg.show.budget && (
            <div className="grid gap-5 sm:grid-cols-[1fr_9rem]">
              <TextField
                label="Budget (optional)"
                hint="A rough figure is fine. Leave blank if you are unsure."
                inputMode="numeric"
                autoComplete="off"
                error={e.budgetAmount?.message}
                {...register('budgetAmount', {
                  setValueAs: (v: unknown) =>
                    v === '' || v == null ? undefined : Number(String(v).replace(/[,\s]/g, '')),
                })}
              />
              <SelectField
                label="Currency"
                placeholder="Currency"
                error={e.budgetCurrency?.message}
                defaultValue="PHP"
                {...register('budgetCurrency')}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </SelectField>
            </div>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            {cfg.show.timeline && (
              <SelectField label="When do you need it?" error={e.timeline?.message} {...register('timeline')}>
                {TIMELINES.map((t) => (
                  <option key={t} value={t}>
                    {TIMELINE_LABELS[t]}
                  </option>
                ))}
              </SelectField>
            )}
            {cfg.show.priority && (
              <SelectField label="Priority" error={e.priority?.message} {...register('priority')}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </SelectField>
            )}
          </div>
        </FormSection>
      )}

      <FormSection title="Anything else">
        {cfg.show.extra && (
          <TextAreaField
            label="Additional information"
            rows={3}
            error={e.additionalInfo?.message}
            {...register('additionalInfo')}
          />
        )}
        <FileDropzone files={files} onChange={setFiles} disabled={isSubmitting} />
        <p className="text-sm text-faint">
          Attachments are not saved in drafts. You will choose them again if you come back later.
        </p>
      </FormSection>

      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Leave this empty
          <input tabIndex={-1} autoComplete="off" {...register('website')} />
        </label>
      </div>
      <Checkbox
        label="I have read how my information is handled (privacy notice). I agree that you may use these details to respond to my request."
        error={e.consent?.message}
        {...register('consent')}
      />
      <Turnstile onToken={flow.setToken} />
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" loading={isSubmitting || flow.submitting}>
          Send my request
        </Button>
        {Object.keys(e).length > 0 && (
          <p role="alert" className="text-sm text-bad">
            Please fix the highlighted fields.
          </p>
        )}
      </div>
      <p className="text-sm text-faint">
        {getValues('hasExistingSystem')
          ? credentialsWarning
          : 'I will reply to the email address you give above.'}
      </p>
    </form>
  );
}
