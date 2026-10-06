import { BRAND_LEAD, BRAND_LINES, HOW_I_WORK, WHY_WORK_WITH_ME } from '@content/brand';
import { comparison } from '@content/solutions';
import { layers, technologies } from '@content/technologies';
import type { Faq } from '@content/faqs';
import type { Testimonial } from '@content/testimonials';
import { Badge, Card, PlaceholderBadge } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { CONTACT_SOON } from '@content/cta';

/** The core brand message, in full. */
export function BrandMessage() {
  return (
    <div className="max-w-3xl">
      <p className="text-h1">{BRAND_LEAD}</p>
      <ul className="mt-8 space-y-3 text-lg text-muted sm:text-xl">
        {BRAND_LINES.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </div>
  );
}

export function WhyWorkWithMe() {
  return (
    <ul className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 md:grid-cols-4">
      {WHY_WORK_WITH_ME.map((w) => (
        <li key={w.title} className="bg-bg p-5">
          <h3 className="font-semibold">{w.title}</h3>
          <p className="mt-1.5 text-sm text-muted">{w.text}</p>
        </li>
      ))}
    </ul>
  );
}

export function HowIWorkSteps() {
  return (
    <ol className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
      {HOW_I_WORK.map((s, i) => (
        <li key={s.title} className="rounded-lg border border-line bg-s1 p-5">
          <span aria-hidden className="font-mono text-sm text-accent">
            {String(i + 1).padStart(2, '0')}
          </span>
          <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
          <p className="mt-2 text-sm text-muted">{s.text}</p>
        </li>
      ))}
    </ol>
  );
}

export function CompareTable() {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <caption className="sr-only">
          {comparison.caption}: outdated system compared with a modernized system
        </caption>
        <thead className="bg-s1">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium text-muted">
              Area
            </th>
            <th scope="col" className="px-4 py-3 font-medium text-muted">
              Outdated system
            </th>
            <th scope="col" className="px-4 py-3 font-medium text-accent">
              Modernized system
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {comparison.rows.map((r) => (
            <tr key={r.aspect}>
              <th scope="row" className="px-4 py-3 font-medium">
                {r.aspect}
              </th>
              <td className="px-4 py-3 text-muted">{r.before}</td>
              <td className="px-4 py-3">{r.after}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TechGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      {layers.map((layer) => (
        <Card key={layer}>
          <h3 className="text-lg font-semibold">{layer}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {technologies
              .filter((t) => t.layer === layer)
              .map((t) => (
                <li key={t.name}>
                  <span className="font-medium">{t.name}</span>
                  <span className="text-muted"> · {t.note}</span>
                </li>
              ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

/** Native details/summary: accessible and works without JavaScript. */
export function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="divide-y divide-line rounded-lg border border-line">
      {items.map((f) => (
        <details key={f.id} className="group p-5 open:bg-s1">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
            <span>{f.q}</span>
            <span aria-hidden className="text-muted transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="mt-3 max-w-prose text-muted">
            {f.a}
            {f.placeholder && (
              <>
                {' '}
                <PlaceholderBadge />
              </>
            )}
          </p>
        </details>
      ))}
    </div>
  );
}

export function TestimonialCards({ items }: { items: Testimonial[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((t) => (
        <Card key={t.id}>
          {!t.verified && <PlaceholderBadge />}
          <blockquote className="mt-3 text-muted">{t.quote}</blockquote>
          <p className="mt-4 text-sm">
            <span className="font-medium">{t.author}</span>
            <span className="text-faint">, {t.org}</span>
          </p>
        </Card>
      ))}
    </div>
  );
}

export function ContactPaths() {
  const paths = [
    { label: 'I Need a New System', text: 'Tell me about the system you want built.' },
    {
      label: 'I Already Have a System',
      text: 'Maintenance, troubleshooting, modernization, or enhancement.',
    },
    { label: 'I Have an Idea', text: 'Not sure where to start? We can work it out together.' },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {paths.map((p) => (
        <Card key={p.label} className="flex flex-col">
          <h3 className="text-h3">{p.label}</h3>
          <p className="mt-2 text-sm text-muted">{p.text}</p>
          <div className="mt-auto pt-5">
            <Button variant="secondary" disabledReason={CONTACT_SOON}>
              {p.label}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

export const StatusBadge = Badge;
