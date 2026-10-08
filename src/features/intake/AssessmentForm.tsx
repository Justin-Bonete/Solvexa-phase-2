import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { credentialsWarning } from '@content/site.config';
import {
  ACCESS_LABELS,
  ACCESS_STATES,
  ONLINE_LABELS,
  ONLINE_STATUSES,
  USER_BANDS,
  USER_BAND_LABELS,
} from '@shared/enums';
import { assessmentInput, type AssessmentInput } from '@shared/schemas/inquiry';
import { Alert } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Form';
import { FormSection, SelectField, TextAreaField, TextField } from '@/components/ui/Fields';
import { FileDropzone } from '@/components/ui/FileDropzone';
import { Turnstile } from '@/components/ui/Turnstile';
import { Confirmation } from './Confirmation';
import { useDraft } from './useDraft';
import { useSubmit } from './useSubmit';

export function AssessmentForm() {
  const form = useForm<AssessmentInput>({ resolver: zodResolver(assessmentInput), mode: 'onTouched' });
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = form;
  const [files, setFiles] = useState<File[]>([]);
  const [confirmedEmail, setConfirmedEmail] = useState('');
  const flow = useSubmit<AssessmentInput>('/assessments', setError);
  const draft = useDraft('solvexa:draft:v1:assessment', form, !flow.created);

  const onSubmit = handleSubmit(async (values) => {
    const res = await flow.submit({ ...values });
    if (res) {
      setConfirmedEmail(values.email);
      draft.clear();
    }
  });

  if (flow.created)
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
  const e = errors;
  const access = (name: 'hasSourceAccess' | 'hasServerAccess' | 'hasDbAccess', label: string) => (
    <SelectField label={label} required error={e[name]?.message} {...register(name)}>
      {ACCESS_STATES.map((s) => (
        <option key={s} value={s}>
          {ACCESS_LABELS[s]}
        </option>
      ))}
    </SelectField>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-10">
      <Alert tone="warning" title="Do not send credentials">
        {credentialsWarning}
      </Alert>
      <p className="text-sm text-faint" role="status">
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
        </div>
      </FormSection>

      <FormSection title="The system">
        <TextField
          label="What is the system called, or what does it do?"
          required
          error={e.currentSystem?.message}
          {...register('currentSystem')}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Technology"
            hint="For example: PHP, WordPress, Excel. Say 'not sure' if you do not know."
            error={e.technology?.message}
            {...register('technology')}
          />
          <TextField
            label="Who built it originally?"
            error={e.originalDeveloper?.message}
            {...register('originalDeveloper')}
          />
          <TextField
            label="System address (URL)"
            type="url"
            inputMode="url"
            placeholder="https://"
            error={e.systemUrl?.message}
            {...register('systemUrl')}
          />
          <SelectField label="Is it online?" required error={e.isOnline?.message} {...register('isOnline')}>
            {ONLINE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ONLINE_LABELS[s]}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Database"
            hint="For example: MySQL, PostgreSQL, not sure"
            error={e.databaseType?.message}
            {...register('databaseType')}
          />
          <SelectField
            label="How many people use it?"
            error={e.userCount?.message}
            {...register('userCount')}
          >
            {USER_BANDS.map((b) => (
              <option key={b} value={b}>
                {USER_BAND_LABELS[b]}
              </option>
            ))}
          </SelectField>
        </div>
      </FormSection>

      <FormSection title="What is wrong, and what you want">
        <TextAreaField
          label="Problems"
          required
          rows={5}
          error={e.problems?.message}
          {...register('problems')}
        />
        <TextAreaField
          label="Errors you see"
          rows={3}
          hint="Paste the wording of any error messages."
          error={e.errorsObserved?.message}
          {...register('errorsObserved')}
        />
        <TextAreaField
          label="Features to improve or add"
          rows={3}
          error={e.featuresToImprove?.message}
          {...register('featuresToImprove')}
        />
        <TextAreaField
          label="Desired improvements"
          required
          rows={4}
          error={e.desiredImprovements?.message}
          {...register('desiredImprovements')}
        />
      </FormSection>

      <FormSection title="Access">
        <p className="max-w-prose text-sm text-muted">
          Tell me only whether you have each kind of access. I will arrange a secure way to share anything if
          it is needed.
        </p>
        <div className="grid gap-5 sm:grid-cols-3">
          {access('hasSourceAccess', 'Source code access?')}
          {access('hasServerAccess', 'Server or hosting access?')}
          {access('hasDbAccess', 'Database access?')}
        </div>
      </FormSection>

      <FormSection title="Screenshots and documents">
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
          Request my assessment
        </Button>
        {Object.keys(e).length > 0 && (
          <p role="alert" className="text-sm text-bad">
            Please fix the highlighted fields.
          </p>
        )}
      </div>
    </form>
  );
}
