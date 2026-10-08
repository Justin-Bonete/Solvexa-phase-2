// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { credentialsWarning } from '@content/site.config';
import { InquiryForm } from '@/features/intake/InquiryForm';
import { AssessmentForm } from '@/features/intake/AssessmentForm';
import Contact from '@/pages/Contact';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn(), upload: vi.fn() } };
});
import { api, ApiError } from '@/lib/api';

const post = vi.mocked(api.post);
const upload = vi.mocked(api.upload);
const CREATED = {
  ok: true,
  id: 'req-1',
  reference: 'INQ-2026-000042',
  uploadToken: 'tok.sig',
  emailStatus: 'sent',
};

beforeEach(() => {
  window.localStorage.clear();
  post.mockReset();
  upload.mockReset();
});
afterEach(cleanup);

const at = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);
const change = (label: RegExp | string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const send = () => fireEvent.click(screen.getByRole('button', { name: /send my request/i }));

function fillValid() {
  change(/^Full name/, 'Ada Lovelace');
  change(/^Email/, 'ada@example.com');
  change(/^Project type/, 'business_system');
  change(/^What do you need/, 'I need an inventory system for three branches.');
  fireEvent.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
}

describe('inquiry form: tailoring and the existing-system toggle', () => {
  it('hides the existing-system questions on the new-system path until the visitor says they have one', () => {
    at(<InquiryForm path="new" />);
    expect(screen.queryByText('About your existing system')).toBeNull();
    expect(screen.queryByLabelText(/Current technology/)).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'I already have a system' }));
    expect(screen.getByText('About your existing system')).toBeInTheDocument();
    expect(screen.getByLabelText(/Current technology/)).toBeInTheDocument();
    expect(screen.getByLabelText(/System address/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'I need a new system' }));
    expect(screen.queryByLabelText(/Current technology/)).toBeNull();
  });

  it('shows the credentials warning wherever existing-system questions appear', () => {
    at(<InquiryForm path="existing" />);
    expect(screen.getAllByText(credentialsWarning).length).toBeGreaterThan(0);
    expect(screen.getByRole('radio', { name: 'I already have a system' })).toBeChecked();
    expect(screen.getByRole('link', { name: /system assessment form/i })).toHaveAttribute(
      'href',
      '/assessment',
    );
  });

  it('asks only the short set of questions on the idea path', () => {
    at(<InquiryForm path="idea" />);
    expect(screen.queryByLabelText(/^Project type/)).toBeNull();
    expect(screen.queryByLabelText(/^Priority/)).toBeNull();
    expect(screen.queryByLabelText(/Required features/)).toBeNull();
    expect(screen.getByLabelText(/^Your idea/)).toBeInTheDocument();
  });
});

describe('inquiry form: validation', () => {
  it('shows inline errors tied to their fields and sends nothing', async () => {
    at(<InquiryForm path="new" />);
    send();
    await waitFor(() => expect(screen.getByLabelText(/^Full name/)).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getByLabelText(/^Full name/)).toHaveAccessibleDescription('Enter your full name');
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Accept the privacy notice to continue')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('rejects a short description and an invalid website address before sending', async () => {
    at(<InquiryForm path="existing" />);
    fillValid();
    change(/^What do you need/, 'too short');
    change(/System address/, 'javascript:alert(1)');
    send();
    await waitFor(() => expect(screen.getByText(/at least 20 characters/)).toBeInTheDocument());
    expect(screen.getByText(/starting with http/)).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });
});

describe('inquiry form: submission honesty', () => {
  it('shows no reference until the server confirms the save, then shows exactly what the server returned', async () => {
    let resolve!: (v: unknown) => void;
    post.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }) as never,
    );
    at(<InquiryForm path="new" />);
    fillValid();
    send();
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/INQ-/)).toBeNull();
    expect(screen.queryByText(/Your request is saved/)).toBeNull();
    resolve(CREATED);
    expect(await screen.findByText('INQ-2026-000042')).toBeInTheDocument();
    expect(screen.getByText(/Your request is saved/)).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
  });

  it('sends a clean payload with an idempotency key and without empty values or hidden fields', async () => {
    post.mockResolvedValueOnce(CREATED as never);
    at(<InquiryForm path="new" />);
    fillValid();
    send();
    await screen.findByText('INQ-2026-000042');
    const [url, payload, opts] = post.mock.calls[0] as [
      string,
      Record<string, unknown>,
      { headers: Record<string, string> },
    ];
    expect(url).toBe('/inquiries');
    expect(payload).toMatchObject({
      path: 'new',
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      projectType: 'business_system',
      hasExistingSystem: false,
      consent: true,
    });
    expect(typeof payload.startedAt).toBe('number');
    for (const v of Object.values(payload)) expect(v).not.toBe('');
    expect(payload).not.toHaveProperty('currentTechnology');
    expect(payload).not.toHaveProperty('budgetCurrency'); // no amount, so no currency
    expect(payload).not.toHaveProperty('website');
    expect(opts.headers['Idempotency-Key']).toMatch(/^[A-Za-z0-9_-]{16,}/);
  });

  it("shows the error, keeps the visitor's answers, shows no confirmation, and retries with the SAME idempotency key", async () => {
    post.mockRejectedValueOnce(
      new ApiError(0, 'NETWORK', 'Could not reach the server. Check your connection and try again.'),
    );
    post.mockResolvedValueOnce(CREATED as never);
    at(<InquiryForm path="new" />);
    fillValid();
    send();
    expect(await screen.findByText(/Could not reach the server/)).toBeInTheDocument();
    expect(screen.queryByText(/Your request is saved/)).toBeNull();
    expect(screen.getByLabelText(/^Full name/)).toHaveValue('Ada Lovelace');
    send();
    await screen.findByText('INQ-2026-000042');
    const keys = post.mock.calls.map(
      (c) => (c[2] as { headers: Record<string, string> }).headers['Idempotency-Key'],
    );
    expect(keys[0]).toBe(keys[1]);
  });

  it('treats a reply without a reference as a failure, never as a success', async () => {
    post.mockResolvedValueOnce({ ok: true } as never);
    at(<InquiryForm path="new" />);
    fillValid();
    send();
    expect(await screen.findByText(/could not confirm that your request was saved/i)).toBeInTheDocument();
    expect(screen.queryByText(/Your request is saved/)).toBeNull();
  });

  it('maps server validation errors onto the right fields', async () => {
    post.mockRejectedValueOnce(
      new ApiError(422, 'VALIDATION_FAILED', 'Validation failed', [
        { path: 'email', message: 'That address is not accepted' },
      ]),
    );
    at(<InquiryForm path="new" />);
    fillValid();
    send();
    await waitFor(() =>
      expect(screen.getByLabelText(/^Email/)).toHaveAccessibleDescription('That address is not accepted'),
    );
  });

  it('tells the visitor when the confirmation email could not be sent, while still confirming the save', async () => {
    post.mockResolvedValueOnce({ ...CREATED, emailStatus: 'failed' } as never);
    at(<InquiryForm path="new" />);
    fillValid();
    send();
    expect(await screen.findByText('INQ-2026-000042')).toBeInTheDocument();
    expect(screen.getByText('Confirmation email not sent')).toBeInTheDocument();
  });
});

describe('inquiry form: attachments', () => {
  const file = (name: string, size = 1024) =>
    new File([new Uint8Array(size)], name, { type: 'application/octet-stream' });
  const pick = (files: File[]) =>
    fireEvent.change(screen.getByLabelText(/^Attachments/), { target: { files } });

  it('rejects disallowed, empty and oversized files immediately, and lists valid ones', () => {
    at(<InquiryForm path="new" />);
    pick([file('shot.png'), file('setup.exe'), file('empty.pdf', 0), file('huge.pdf', 5 * 1024 * 1024)]);
    expect(screen.getByText('shot.png', { exact: false })).toBeInTheDocument();
    const alert = screen.getByRole('alert');
    expect(within(alert).getByText(/setup\.exe: this file type is not allowed/)).toBeInTheDocument();
    expect(within(alert).getByText(/empty\.pdf: the file is empty/)).toBeInTheDocument();
    expect(within(alert).getByText(/huge\.pdf: larger than 4 MB/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove shot.png' }));
    expect(screen.queryByText('shot.png', { exact: false })).toBeNull();
  });

  it('uploads each file after the save with the upload token, reports real status, and lets a failed file be retried', async () => {
    post.mockResolvedValueOnce(CREATED as never);
    upload
      .mockResolvedValueOnce({ ok: true } as never)
      .mockRejectedValueOnce(
        new ApiError(422, 'UPLOAD_CONTENT_MISMATCH', 'The file content does not match its extension.'),
      )
      .mockResolvedValueOnce({ ok: true } as never);
    at(<InquiryForm path="new" />);
    fillValid();
    pick([file('a.png'), file('b.pdf')]);
    send();
    expect(await screen.findByText('INQ-2026-000042')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText('The file content does not match its extension.')).toBeInTheDocument(),
    );
    expect(upload).toHaveBeenCalledWith('/inquiries/req-1/attachments', expect.any(File), {
      'X-Upload-Token': 'tok.sig',
    });
    expect(screen.getByText('Your request is saved')).toBeInTheDocument(); // a failed file never un-saves the request
    expect(screen.queryByText('All files were uploaded.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry b.pdf' }));
    await screen.findByText('All files were uploaded.');
    expect(upload).toHaveBeenCalledTimes(3);
  });
});

describe('inquiry form: drafts', () => {
  const KEY = 'solvexa:draft:v1:inquiry:new';
  it('saves to this device only, never saves consent or anti-spam fields, restores on return, and clears after a successful send', async () => {
    const first = at(<InquiryForm path="new" />);
    fillValid();
    await waitFor(() => expect(window.localStorage.getItem(KEY)).toBeTruthy(), { timeout: 3000 });
    const saved = JSON.parse(window.localStorage.getItem(KEY) as string) as Record<string, unknown>;
    expect(saved).toMatchObject({ fullName: 'Ada Lovelace', email: 'ada@example.com' });
    for (const k of ['consent', 'website', 'startedAt', 'turnstileToken'])
      expect(saved).not.toHaveProperty(k);
    first.unmount();

    at(<InquiryForm path="new" />);
    await waitFor(() => expect(screen.getByLabelText(/^Full name/)).toHaveValue('Ada Lovelace'));
    expect(screen.getByText(/restored your saved draft/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /privacy notice/i })).not.toBeChecked();

    post.mockResolvedValueOnce(CREATED as never);
    fireEvent.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
    send();
    await screen.findByText('INQ-2026-000042');
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('keeps separate drafts per path', async () => {
    at(<InquiryForm path="idea" />);
    change(/^Full name/, 'Idea Person');
    await waitFor(() => expect(window.localStorage.getItem('solvexa:draft:v1:inquiry:idea')).toBeTruthy(), {
      timeout: 3000,
    });
    expect(window.localStorage.getItem('solvexa:draft:v1:inquiry:new')).toBeNull();
  });
});

describe('assessment form', () => {
  it('leads with the credentials warning and only offers yes / no / not sure for access', () => {
    at(<AssessmentForm />);
    expect(screen.getAllByText(credentialsWarning)[0]).toBeInTheDocument();
    for (const label of [/Source code access/, /Server or hosting access/, /Database access/]) {
      const select = screen.getByLabelText(label) as HTMLSelectElement;
      expect([...select.options].map((o) => o.value)).toEqual(['', 'yes', 'no', 'unsure']);
    }
    expect(screen.queryByLabelText(/password/i)).toBeNull();
  });

  it('requires the essentials and sends to /assessments', async () => {
    post.mockResolvedValueOnce({ ...CREATED, reference: 'ASM-2026-000007' } as never);
    at(<AssessmentForm />);
    fireEvent.click(screen.getByRole('button', { name: /request my assessment/i }));
    await waitFor(() => expect(screen.getByLabelText(/^Problems/)).toHaveAttribute('aria-invalid', 'true'));
    expect(post).not.toHaveBeenCalled();

    change(/^Full name/, 'Grace Hopper');
    change(/^Email/, 'grace@example.com');
    change(/^What is the system called/, 'Grading portal');
    change(/^Problems/, 'It crashes when teachers upload grades.');
    change(/^Is it online/, 'partially');
    change(/^Desired improvements/, 'Faster pages and a mobile layout.');
    change(/Source code access/, 'yes');
    change(/Server or hosting access/, 'unsure');
    change(/Database access/, 'no');
    fireEvent.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
    fireEvent.click(screen.getByRole('button', { name: /request my assessment/i }));
    expect(await screen.findByText('ASM-2026-000007')).toBeInTheDocument();
    expect(post.mock.calls[0]?.[0]).toBe('/assessments');
    expect(post.mock.calls[0]?.[1]).toMatchObject({ hasServerAccess: 'unsure', isOnline: 'partially' });
  });
});

describe('contact hub', () => {
  it('offers the three paths and the assessment form as real links', () => {
    at(<Contact />);
    for (const href of ['/contact/new-system', '/contact/existing-system', '/contact/idea', '/assessment']) {
      expect(document.querySelector(`a[href="${href}"]`), href).not.toBeNull();
    }
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
