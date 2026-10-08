// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn(), upload: vi.fn() } };
});
import { api, ApiError } from '@/lib/api';
import AdminInbox from '@/pages/AdminInbox';
import AdminInquiry from '@/pages/AdminInquiry';

const get = vi.mocked(api.get);
const patch = vi.mocked(api.patch);
const del = vi.mocked(api.del);

const item = (o: Record<string, unknown> = {}) => ({
  id: 'id-1',
  reference: 'INQ-2026-000001',
  kind: 'inquiry',
  status: 'new',
  contactName: 'Ada Lovelace',
  contactEmail: 'ada@example.com',
  organization: 'Acme School',
  projectType: 'business_system',
  path: 'new',
  priority: 'medium',
  createdAt: '2026-10-01T10:00:00.000Z',
  attachmentCount: 2,
  ...o,
});
const page = (items: unknown[], next: string | null = null) => ({
  items,
  nextCursor: next,
  counts: { new: 2, contacted: 1 },
});

const wrap = (ui: React.ReactNode, url = '/admin/inquiries') => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/admin/inquiries" element={ui} />
          <Route path="/admin/inquiries/:id" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  get.mockReset();
  patch.mockReset();
  del.mockReset();
});
afterEach(cleanup);

describe('admin inbox', () => {
  it('lists requests with status, type and file counts, and links each to its detail page', async () => {
    get.mockResolvedValue(
      page([
        item(),
        item({
          id: 'id-2',
          reference: 'ASM-2026-000002',
          kind: 'assessment',
          status: 'contacted',
          attachmentCount: 0,
        }),
      ]) as never,
    );
    wrap(<AdminInbox />);
    expect(await screen.findByRole('link', { name: 'INQ-2026-000001' })).toHaveAttribute(
      'href',
      '/admin/inquiries/id-1',
    );
    expect(screen.getByText('Business System')).toBeInTheDocument();
    expect(screen.getByText('System assessment')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All (3)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New (2)' })).toBeInTheDocument();
  });

  it('asks the server for the chosen status and search, not just filtering in the browser', async () => {
    get.mockResolvedValue(page([item()]) as never);
    wrap(<AdminInbox />);
    await screen.findByRole('link', { name: 'INQ-2026-000001' });
    fireEvent.click(screen.getByRole('button', { name: 'Contacted (1)' }));
    await waitFor(() =>
      expect(get.mock.calls.some((c) => String(c[0]).includes('status=contacted'))).toBe(true),
    );
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'acme & co' } });
    await waitFor(
      () => expect(get.mock.calls.some((c) => String(c[0]).includes('q=acme%20%26%20co'))).toBe(true),
      { timeout: 2000 },
    );
  });

  it('pages with the server cursor', async () => {
    get
      .mockResolvedValueOnce(page([item()], 'CURSOR1') as never)
      .mockResolvedValueOnce(page([item({ id: 'id-9', reference: 'INQ-2026-000009' })]) as never);
    wrap(<AdminInbox />);
    fireEvent.click(await screen.findByRole('button', { name: 'Load more' }));
    expect(await screen.findByRole('link', { name: 'INQ-2026-000009' })).toBeInTheDocument();
    expect(String(get.mock.calls[1]?.[0])).toContain('cursor=CURSOR1');
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
  });

  it('shows an empty state and an error state with retry', async () => {
    get.mockResolvedValueOnce(page([]) as never);
    const first = wrap(<AdminInbox />);
    expect(await screen.findByText('No inquiries yet')).toBeInTheDocument();
    first.unmount();
    get
      .mockRejectedValueOnce(new ApiError(500, 'INTERNAL', 'x'))
      .mockResolvedValueOnce(page([item()]) as never);
    wrap(<AdminInbox />);
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('link', { name: 'INQ-2026-000001' })).toBeInTheDocument();
  });
});

const detail = (over: Record<string, unknown> = {}) => ({
  request: {
    id: 'id-1',
    reference: 'INQ-2026-000001',
    kind: 'inquiry',
    status: 'new',
    contactName: 'Ada <b>Lovelace</b>',
    contactEmail: 'ada@example.com',
    organization: null,
    phone: null,
    country: null,
    industry: null,
    clientId: null,
    path: 'existing',
    projectType: 'system_modernization',
    hasExistingSystem: true,
    currentTechnology: 'PHP 5',
    systemUrl: 'https://old.example.com/login',
    description: '<script>alert(1)</script> Our school portal is slow.',
    mainProblems: null,
    requiredFeatures: null,
    expectedUsers: null,
    budgetAmount: 150000,
    budgetCurrency: 'PHP',
    timeline: 'asap',
    priority: 'high',
    additionalInfo: null,
    internalNotes: 'Called Monday.',
    createdAt: '2026-10-01T10:00:00.000Z',
    ...over,
  },
  assessment: null,
  attachments: [
    {
      id: 'att-1',
      originalName: 'screenshot.png',
      mime: 'image/png',
      sizeBytes: 2048,
      scanStatus: 'not_scanned',
    },
  ],
});

describe('admin inquiry detail', () => {
  const open = () => wrap(<AdminInquiry />, '/admin/inquiries/id-1');

  it('renders visitor text as plain text (no markup execution) and never turns the system address into a link', async () => {
    get.mockResolvedValue(detail() as never);
    const { container } = open();
    await screen.findByRole('heading', { level: 1, name: 'INQ-2026-000001' });
    expect(screen.getByText('Ada <b>Lovelace</b>')).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(screen.getByText('https://old.example.com/login')).toBeInTheDocument();
    expect(container.querySelector('a[href*="old.example.com"]')).toBeNull();
    expect(screen.getByText('150,000 PHP')).toBeInTheDocument();
  });

  it('warns that files are unscanned and offers an authenticated download link', async () => {
    get.mockResolvedValue(detail() as never);
    open();
    const link = await screen.findByRole('link', { name: /Download/ });
    expect(link).toHaveAttribute('href', '/api/v1/admin/attachments/att-1');
    expect(screen.getByText('Not scanned')).toBeInTheDocument();
    expect(screen.getByText(/not virus-scanned/i)).toBeInTheDocument();
  });

  it('saves status and notes through the API and confirms only after it succeeds', async () => {
    get.mockResolvedValue(detail() as never);
    let ok!: (v: unknown) => void;
    patch.mockReturnValueOnce(
      new Promise((r) => {
        ok = r;
      }) as never,
    );
    open();
    await screen.findByRole('heading', { level: 1, name: 'INQ-2026-000001' });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'qualified' } });
    fireEvent.change(screen.getByLabelText(/Internal notes/), { target: { value: 'Good fit.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/admin/inquiries/id-1', {
        status: 'qualified',
        internalNotes: 'Good fit.',
      }),
    );
    expect(screen.queryByText('Saved.')).toBeNull();
    ok({ ok: true });
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
  });

  it('shows the real error when saving fails', async () => {
    get.mockResolvedValue(detail() as never);
    patch.mockRejectedValueOnce(new ApiError(403, 'MFA_REQUIRED', 'Two-factor verification is required.'));
    open();
    await screen.findByRole('heading', { level: 1, name: 'INQ-2026-000001' });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Two-factor verification is required.')).toBeInTheDocument();
    expect(screen.queryByText('Saved.')).toBeNull();
  });

  it('needs a second click to delete', async () => {
    get.mockResolvedValue(detail() as never);
    del.mockResolvedValue({ ok: true } as never);
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete request' }));
    expect(del).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    await waitFor(() => expect(del).toHaveBeenCalledWith('/admin/inquiries/id-1'));
  });

  it('shows the not-found page when the request does not exist', async () => {
    get.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Not found.'));
    open();
    expect(await screen.findByText('That page does not exist')).toBeInTheDocument();
    void within;
  });
});
