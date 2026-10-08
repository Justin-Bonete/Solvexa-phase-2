import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

type Loader = () => Promise<{ default: ComponentType }>;
export type AppRoute = { path: string; load: Loader; guard?: 'client' | 'admin' };

/** Single route table, used by the client router and by tests. */
export const appRoutes: AppRoute[] = [
  { path: '/', load: () => import('@/pages/Home') },
  { path: '/services', load: () => import('@/pages/Services') },
  { path: '/solutions', load: () => import('@/pages/Solutions') },
  { path: '/projects', load: () => import('@/pages/Projects') },
  { path: '/projects/:slug', load: () => import('@/pages/ProjectDetail') },
  { path: '/new-system-development', load: () => import('@/pages/NewSystem') },
  { path: '/enhancement', load: () => import('@/pages/Enhancement') },
  { path: '/maintenance', load: () => import('@/pages/Maintenance') },
  { path: '/process', load: () => import('@/pages/Process') },
  { path: '/technology', load: () => import('@/pages/Technology') },
  { path: '/about', load: () => import('@/pages/About') },
  { path: '/faq', load: () => import('@/pages/Faq') },
  { path: '/privacy', load: () => import('@/pages/Privacy') },
  { path: '/terms', load: () => import('@/pages/Terms') },
  { path: '/contact', load: () => import('@/pages/Contact') },
  { path: '/contact/new-system', load: () => import('@/pages/ContactNew') },
  { path: '/contact/existing-system', load: () => import('@/pages/ContactExisting') },
  { path: '/contact/idea', load: () => import('@/pages/ContactIdea') },
  { path: '/assessment', load: () => import('@/pages/Assessment') },
  { path: '/login', load: () => import('@/pages/Login') },
  { path: '/register', load: () => import('@/pages/Register') },
  { path: '/forgot-password', load: () => import('@/pages/ForgotPassword') },
  { path: '/reset-password', load: () => import('@/pages/ResetPassword') },
  { path: '/verify-email', load: () => import('@/pages/VerifyEmail') },
  { path: '/mfa', load: () => import('@/pages/Mfa') },
  { path: '/portal', load: () => import('@/pages/Portal'), guard: 'client' },
  { path: '/admin', load: () => import('@/pages/Admin'), guard: 'admin' },
  { path: '/admin/inquiries', load: () => import('@/pages/AdminInbox'), guard: 'admin' },
  { path: '/admin/inquiries/:id', load: () => import('@/pages/AdminInquiry'), guard: 'admin' },
  ...(import.meta.env?.DEV ? [{ path: '/_ui', load: () => import('@/pages/UiKit') }] : []),
];
export const notFoundLoad: Loader = () => import('@/pages/NotFound');

export const lazyOf = (l: Loader): LazyExoticComponent<ComponentType> => lazy(l);
