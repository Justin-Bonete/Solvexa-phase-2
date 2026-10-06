// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/Form';
import { safeReturnTo } from '@/features/auth/useAuth';
import { applyApiError } from '@/features/auth/forms';
import { ApiError } from '@/lib/api';
import { metaFor, routeMeta } from '@/lib/seo';
import { appRoutes } from '@/routes';
import { prerenderPaths } from '@/prerender';
import { matchPath } from 'react-router-dom';

describe('Button', () => {
  it('shows the reason for a disabled button and does not fire onClick', () => {
    const onClick = vi.fn();
    render(
      <Button disabledReason="Opens in a later release." onClick={onClick}>
        Start
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Start' });
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Opens in a later release.')).toBeVisible();
    expect(btn).toHaveAccessibleDescription('Opens in a later release.');
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('FormField', () => {
  it('associates label, hint and error with the control', () => {
    render(
      <FormField label="Email" hint="Work address" error="Enter a valid email">
        {(a) => <Input {...a} aria-describedby={a.describedBy} />}
      </FormField>,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Work address Enter a valid email');
  });
});

describe('safeReturnTo', () => {
  it('accepts internal paths and rejects open redirects', () => {
    expect(safeReturnTo('/portal')).toBe('/portal');
    expect(safeReturnTo('//evil.com')).toBeNull();
    expect(safeReturnTo('https://evil.com')).toBeNull();
    expect(safeReturnTo('/\\evil.com')).toBeNull();
    expect(safeReturnTo(null)).toBeNull();
  });
});

describe('applyApiError', () => {
  it('maps 422 field errors onto the form', () => {
    const setError = vi.fn();
    applyApiError(
      new ApiError(422, 'VALIDATION_FAILED', 'Validation failed', [{ path: 'email', message: 'Bad email' }]),
      setError,
    );
    expect(setError).toHaveBeenCalledWith('email', { type: 'server', message: 'Bad email' });
  });
  it('gives a retry hint for 429', () => {
    expect(applyApiError(new ApiError(429, 'RATE_LIMITED', 'x', [], 600), vi.fn())).toContain('10 minute');
  });
});

describe('SEO and routes', () => {
  it('has a unique title for every route', () => {
    const titles = Object.values(routeMeta).map((m) => m.title);
    expect(new Set(titles).size).toBe(titles.length);
    for (const m of Object.values(routeMeta)) expect(m.description.length).toBeGreaterThan(20);
  });
  it('every prerendered route exists in the route table and has metadata', () => {
    for (const r of prerenderPaths(false)) {
      expect(appRoutes.some((a) => matchPath(a.path, r))).toBe(true);
      expect(metaFor(r).title).not.toBe(routeMeta['/404']?.title);
    }
  });
  it('private areas are never indexable', () => {
    for (const p of ['/portal', '/admin', '/mfa', '/login']) expect(routeMeta[p]?.indexable).toBe(false);
  });
  void MemoryRouter;
});
