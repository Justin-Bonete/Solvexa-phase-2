import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Container } from '@/components/ui/Feedback';

/** Fades content in once as it scrolls into view. Content is fully visible without JavaScript or under reduced motion. */
export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'initial' | 'hidden' | 'shown'>('initial');
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (
      reduced ||
      !('IntersectionObserver' in window) ||
      el.getBoundingClientRect().top < window.innerHeight
    ) {
      setState('shown');
      return;
    }
    setState('hidden');
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setState('shown');
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const motion =
    state === 'hidden'
      ? 'translate-y-3 opacity-0'
      : state === 'shown'
        ? 'translate-y-0 opacity-100 transition duration-[400ms] ease-out'
        : '';
  return (
    <div ref={ref} className={`${motion} ${className}`}>
      {children}
    </div>
  );
}

type SectionProps = { id: string; title: string; lead?: ReactNode; children: ReactNode; raised?: boolean };
export function Section({ id, title, lead, children, raised }: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-h`}
      className={`border-t border-line ${raised ? 'bg-s1/50' : ''}`}
    >
      <Container className="py-16 sm:py-20">
        <Reveal>
          <div className="max-w-prose">
            <h2 id={`${id}-h`} className="text-h2">
              {title}
            </h2>
            {lead && <p className="mt-3 text-lg text-muted">{lead}</p>}
          </div>
          <div className="mt-10">{children}</div>
        </Reveal>
      </Container>
    </section>
  );
}

export function PageHero({
  title,
  lead,
  children,
  verb,
}: {
  title: string;
  lead: string;
  children?: ReactNode;
  verb?: string;
}) {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-[360px] bg-[radial-gradient(60%_60%_at_50%_0%,rgb(var(--c-accent)/0.10),transparent)]"
      />
      <Container className="relative py-14 sm:py-20">
        {verb && <p className="text-sm font-medium text-accent">{verb}</p>}
        <h1 className="mt-2 max-w-3xl text-h1">{title}</h1>
        <p className="mt-5 max-w-prose text-lg text-muted">{lead}</p>
        {children && <div className="mt-8 flex flex-wrap items-start gap-x-4 gap-y-6">{children}</div>}
      </Container>
    </section>
  );
}
