import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { mainNav } from '@content/navigation';
import { siteConfig } from '@content/site.config';
import { useAuth, homeFor, useLogout } from '@/features/auth/useAuth';
import { ButtonLink, Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Feedback';

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const logout = useLogout();
  const items = mainNav.filter((i) => i.enabled);
  const link = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-sm ${isActive ? 'text-fg' : 'text-muted hover:text-fg'}`;

  const account = user ? (
    <>
      <ButtonLink to={homeFor(user)} variant="secondary">
        {user.role === 'admin' ? 'Admin' : 'Portal'}
      </ButtonLink>
      <Button variant="tertiary" loading={logout.isPending} onClick={() => logout.mutate()}>
        Sign out
      </Button>
    </>
  ) : (
    <>
      <ButtonLink to="/login" variant="tertiary">
        Sign in
      </ButtonLink>
      <ButtonLink to="/register" variant="secondary">
        Create account
      </ButtonLink>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link
          to="/"
          className="text-lg font-semibold tracking-tight"
          aria-label={`${siteConfig.brand.name} home`}
        >
          {siteConfig.brand.name}
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} className={link}>
              {i.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-2 sm:flex">{account}</div>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-line-strong sm:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((o) => !o)}
        >
          <svg
            aria-hidden
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            {open ? <path d="M5 5l10 10M15 5L5 15" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
          </svg>
        </button>
      </Container>
      {open && (
        <div
          id="mobile-menu"
          className="border-t border-line sm:hidden"
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        >
          <Container className="flex flex-col gap-1 py-4">
            {items.map((i) => (
              <NavLink key={i.to} to={i.to} className={link} onClick={() => setOpen(false)}>
                {i.label}
              </NavLink>
            ))}
            <div className="mt-2 flex flex-wrap items-center gap-2" onClick={() => setOpen(false)}>
              {account}
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}
