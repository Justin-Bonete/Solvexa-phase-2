/// <reference types="node" />
import { StrictMode } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { PassThrough } from 'node:stream';
import App from './App';
import { canonicalFor, jsonLdFor, metaFor } from './lib/seo';
import { visibleFaqs } from './lib/visibility';
export { indexablePaths, prerenderPaths } from './prerender';

export function render(url: string): Promise<{ html: string; head: string }> {
  return new Promise((resolve, reject) => {
    const sink = new PassThrough();
    const chunks: Buffer[] = [];
    sink.on('data', (c: Buffer) => chunks.push(c));
    sink.on('end', () => resolve({ html: Buffer.concat(chunks).toString('utf8'), head: headFor(url) }));
    const { pipe } = renderToPipeableStream(
      <StrictMode>
        <StaticRouter location={url}>
          <App />
        </StaticRouter>
      </StrictMode>,
      { onAllReady: () => pipe(sink), onShellError: reject, onError: reject },
    );
  });
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function headFor(path: string): string {
  const m = metaFor(path);
  const canonical = canonicalFor(path);
  const parts = [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}" />`,
    `<meta name="robots" content="${m.indexable ? 'index,follow' : 'noindex,nofollow'}" />`,
    `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
    `<meta name="twitter:card" content="summary" />`,
  ];
  for (const ld of jsonLdFor(path, visibleFaqs()))
    parts.push(`<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`);
  return parts.join('\n    ');
}
