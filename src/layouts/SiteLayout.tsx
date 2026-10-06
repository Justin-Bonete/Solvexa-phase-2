import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

/** On navigation: jump to #anchors, otherwise reset scroll and move focus to the page start for screen readers. */
function useRouteEffects() {
  const { pathname, hash } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    if (hash) {
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
    } else if (!first.current) {
      window.scrollTo(0, 0);
      document.getElementById('main')?.focus({ preventScroll: true });
    }
    first.current = false;
  }, [pathname, hash]);
}

export default function SiteLayout() {
  usePageMeta();
  useRouteEffects();
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent"
      >
        Skip to main content
      </a>
      <Navbar />
      <main id="main" tabIndex={-1} className="min-h-[60vh] outline-none">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
