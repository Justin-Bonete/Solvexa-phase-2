// Prerenders public routes into static HTML (ADR-001), then writes the SPA shell, 404, sitemap and robots.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dist = 'dist';
const template = await readFile(join(dist, 'index.html'), 'utf8');
if (!template.includes('<!--app-html-->') || !template.includes('<!--app-head-->')) {
  throw new Error('index.html template markers were removed by the build; prerender cannot continue.');
}
const { render, headFor, prerenderPaths, indexablePaths } = await import(
  pathToFileURL(join(process.cwd(), 'dist-ssr', 'entry-server.js')).href
);
const PRERENDER = prerenderPaths();
const INDEXABLE = indexablePaths();

const fill = (head, html, ssr) =>
  template
    .replace('<!--app-head-->', head)
    .replace(
      '<div id="root"><!--app-html--></div>',
      `<div id="root"${ssr ? ' data-ssr="1"' : ''}>${html}</div>`,
    );

for (const route of PRERENDER) {
  const { html, head } = await render(route);
  const out = route === '/' ? join(dist, 'index.html') : join(dist, route, 'index.html');
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, fill(head, html, true));
  console.log(`prerendered ${route}`);
}

// Non-prerendered routes (portal, admin, token pages) use an empty shell and are rendered on the client only.
await writeFile(join(dist, 'app-shell.html'), fill(headFor('/portal'), '', false));
const nf = await render('/404');
await writeFile(join(dist, '404.html'), fill(nf.head, nf.html, true));

const site = (process.env.VITE_SITE_URL ?? 'http://localhost:5173').replace(/\/$/, '');
const urls = INDEXABLE.map((p) => `  <url><loc>${site}${p === '/' ? '/' : p}</loc></url>`).join('\n');
await writeFile(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
);
await writeFile(
  join(dist, 'robots.txt'),
  `User-agent: *\nAllow: /\nDisallow: /portal\nDisallow: /admin\nDisallow: /api/\nSitemap: ${site}/sitemap.xml\n`,
);
console.log('wrote app-shell.html, 404.html, sitemap.xml, robots.txt');
