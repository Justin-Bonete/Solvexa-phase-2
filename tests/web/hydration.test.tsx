// @vitest-environment jsdom
import { act, type ComponentType } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { projects } from '@content/projects';
import Home from '@/pages/Home';
import Services from '@/pages/Services';
import Solutions from '@/pages/Solutions';
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';
import { Maintenance, Enhancement, NewSystem } from '@/pages/Landing';
import About from '@/pages/About';
import Process from '@/pages/Process';
import Technology from '@/pages/Technology';
import Faq from '@/pages/Faq';
import { Privacy, Terms } from '@/pages/Legal';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

const tree = (Page: ComponentType, url: string) => (
  <MemoryRouter initialEntries={[url]}>
    <Routes>
      <Route path="*" element={<Page />} />
    </Routes>
  </MemoryRouter>
);

const pages: [string, ComponentType, string][] = [
  ['/', Home, '/'],
  ['/services', Services, '/services'],
  ['/solutions', Solutions, '/solutions'],
  ['/projects', Projects, '/projects'],
  [`/projects/${projects[0]?.slug}`, ProjectDetail, `/projects/${projects[0]?.slug}`],
  ['/maintenance', Maintenance, '/maintenance'],
  ['/enhancement', Enhancement, '/enhancement'],
  ['/new-system-development', NewSystem, '/new-system-development'],
  ['/about', About, '/about'],
  ['/process', Process, '/process'],
  ['/technology', Technology, '/technology'],
  ['/faq', Faq, '/faq'],
  ['/privacy', Privacy, '/privacy'],
  ['/terms', Terms, '/terms'],
];

describe('server HTML hydrates cleanly (no React hydration warnings)', () => {
  it.each(pages)('%s', async (_name, Page, url) => {
    const html = renderToString(tree(Page, url));
    const host = document.createElement('div');
    host.innerHTML = html;
    document.body.appendChild(host);
    const errors: string[] = [];
    vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => {
      errors.push(a.map(String).join(' '));
    });
    await act(async () => {
      hydrateRoot(host, tree(Page, url));
    });
    expect(errors).toEqual([]);
    expect(host.querySelector('h1')).not.toBeNull();
  });
});
