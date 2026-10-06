// Reports gzipped initial JS and CSS for the prerendered home page, and fails above the 170 KB budget.
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const BUDGET = 170 * 1024;
const html = readFileSync('dist/index.html', 'utf8');
const refs = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]);
let js = 0;
let css = 0;
for (const r of new Set(refs)) {
  const gz = gzipSync(readFileSync(join('dist', r))).length;
  if (r.endsWith('.js')) js += gz;
  else css += gz;
  console.log(`${(gz / 1024).toFixed(1).padStart(7)} KB gz  ${r}`);
}
const fonts = readdirSync('dist/assets').filter((f) => f.endsWith('.woff2')).length;
console.log(`\nInitial JS (gzip): ${(js / 1024).toFixed(1)} KB (budget ${BUDGET / 1024} KB)`);
console.log(`Initial CSS (gzip): ${(css / 1024).toFixed(1)} KB`);
console.log(`Font files emitted: ${fonts} (browser downloads only the subsets a page needs)`);
if (js > BUDGET) {
  console.error('Initial JS exceeds budget');
  process.exit(1);
}
