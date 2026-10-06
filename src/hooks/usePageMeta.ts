import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { canonicalFor, metaFor } from '@/lib/seo';

function setMeta(selector: string, create: () => HTMLElement, attr: string, value: string) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

/** Keeps title, description, canonical and robots in sync on client-side navigation. Prerender writes the same values into static HTML. */
export function usePageMeta() {
  const { pathname } = useLocation();
  useEffect(() => {
    const m = metaFor(pathname);
    document.title = m.title;
    setMeta(
      'meta[name="description"]',
      () => Object.assign(document.createElement('meta'), { name: 'description' }),
      'content',
      m.description,
    );
    setMeta(
      'meta[name="robots"]',
      () => Object.assign(document.createElement('meta'), { name: 'robots' }),
      'content',
      m.indexable ? 'index,follow' : 'noindex,nofollow',
    );
    setMeta(
      'link[rel="canonical"]',
      () => Object.assign(document.createElement('link'), { rel: 'canonical' }),
      'href',
      canonicalFor(pathname),
    );
  }, [pathname]);
}
