import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/index.css', 'utf8');
const tok = (n: string): [number, number, number] => {
  const m = css.match(new RegExp(`--c-${n}:\\s*(\\d+) (\\d+) (\\d+)`));
  if (!m) throw new Error(`token ${n} missing`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};
const lum = ([r, g, b]: [number, number, number]) => {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(tok(a)), lum(tok(b))].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
};

describe('WCAG 2.2 AA text contrast (4.5:1) on every surface', () => {
  const surfaces = ['bg', 's1', 's2'];
  const text = ['fg', 'muted', 'faint', 'accent', 'ok', 'warn', 'bad'];
  for (const s of surfaces)
    for (const t of text) {
      it(`${t} on ${s}`, () => expect(ratio(t, s)).toBeGreaterThanOrEqual(4.5));
    }
  it('on-accent on accent and accent-hover', () => {
    expect(ratio('on-accent', 'accent')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('on-accent', 'accent-hover')).toBeGreaterThanOrEqual(4.5);
  });
  it('focus ring (accent) vs background meets 3:1 for UI components', () =>
    expect(ratio('accent', 'bg')).toBeGreaterThanOrEqual(3));
});
