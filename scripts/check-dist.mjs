// Fails the build if placeholder text leaks into production HTML, or the sitemap lists non-indexable pages.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const hide = (process.env.VITE_HIDE_PLACEHOLDERS ?? 'true') === 'true';
const walk = (d) =>
  readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const html = walk('dist').filter((f) => f.endsWith('.html'));
let bad = 0;

if (hide) {
  for (const f of html) {
    const t = readFileSync(f, 'utf8');
    const hit = t.match(/Placeholder|Client name|To do:|Not provided yet/);
    if (hit) {
      console.error(`Placeholder text "${hit[0]}" found in ${f}`);
      bad++;
    }
  }
}
const sitemap = readFileSync('dist/sitemap.xml', 'utf8');
for (const p of ['/portal', '/admin', '/login', '/register', '/mfa']) {
  if (sitemap.includes(`${p}</loc>`)) {
    console.error(`Sitemap lists private page ${p}`);
    bad++;
  }
}
for (const f of html) {
  const t = readFileSync(f, 'utf8');
  if (!/<title>[^<]+<\/title>/.test(t) || !/name="description"/.test(t)) {
    console.error(`Missing title/description in ${f}`);
    bad++;
  }
  if (f !== 'dist/app-shell.html' && (t.match(/<h1[ >]/g) ?? []).length > 1) {
    console.error(`More than one h1 in ${f}`);
    bad++;
  }
}
console.log(
  `Checked ${html.length} HTML files (placeholders ${hide ? 'must be hidden' : 'allowed'}): ${bad ? bad + ' problem(s)' : 'OK'}`,
);
process.exit(bad ? 1 : 0);
