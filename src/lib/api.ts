export type FieldError = { path: string; message: string };

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly errors: FieldError[] = [],
    public readonly retryAfterSec?: number,
  ) {
    super(message);
  }
}

let csrfToken: string | null = null;
export const setCsrfToken = (t: string | null) => {
  csrfToken = t;
};

type Opts = { headers?: Record<string, string>; form?: FormData };

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
  opts: Opts = {},
  retried = false,
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...(opts.headers ?? {}) };
  if (body !== undefined && !opts.form) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') {
    if (!csrfToken) csrfToken = (await request<{ csrfToken: string }>('GET', '/auth/csrf')).csrfToken;
    headers['X-CSRF-Token'] = csrfToken;
  }
  let res: Response;
  try {
    res = await fetch(`/api/v1${url}`, {
      method,
      headers,
      credentials: 'same-origin',
      // For FormData the browser sets the multipart boundary itself, so no Content-Type is set above.
      ...(opts.form ? { body: opts.form } : body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Could not reach the server. Check your connection and try again.');
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.ok) {
    if (typeof data.csrfToken === 'string') csrfToken = data.csrfToken;
    return data as T;
  }
  if (res.status === 403 && data.code === 'CSRF_INVALID' && !retried) {
    csrfToken = null;
    return request<T>(method, url, body, opts, true);
  }
  const retry = Number(res.headers.get('Retry-After')) || undefined;
  throw new ApiError(
    res.status,
    String(data.code ?? 'ERROR'),
    String(data.title ?? 'Something went wrong.'),
    (data.errors as FieldError[] | undefined) ?? [],
    retry,
  );
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, body?: unknown, opts?: Opts) => request<T>('POST', url, body ?? {}, opts),
  patch: <T>(url: string, body: unknown) => request<T>('PATCH', url, body),
  del: <T>(url: string) => request<T>('DELETE', url),
  upload: <T>(url: string, file: File, headers: Record<string, string>) => {
    const form = new FormData();
    form.append('file', file);
    return request<T>('POST', url, undefined, { headers, form });
  },
};
