import { useId, useRef, useState, type KeyboardEvent } from 'react';

type Step = { title: string; text: string };

/**
 * Keyboard-operable stepper using the tabs pattern: arrow keys, Home and End move between steps.
 * No autoplay and no motion beyond a colour change, so it is safe for reduced-motion users.
 */
export function ProcessVisual({ steps, label }: { steps: readonly Step[]; label: string }) {
  const [active, setActive] = useState(0);
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const go = (i: number) => {
    const n = (i + steps.length) % steps.length;
    setActive(n);
    refs.current[n]?.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      go(active + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      go(active - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      go(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      go(steps.length - 1);
    }
  };
  const current = steps[active];

  return (
    <div>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKey}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      >
        {steps.map((s, i) => {
          const on = i === active;
          return (
            <button
              key={s.title}
              ref={(el) => {
                refs.current[i] = el;
              }}
              role="tab"
              id={`${id}-tab-${i}`}
              aria-selected={on}
              aria-controls={`${id}-panel`}
              tabIndex={on ? 0 : -1}
              type="button"
              onClick={() => setActive(i)}
              className={`flex min-h-[44px] shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${on ? 'border-accent bg-accent/10 text-fg' : i < active ? 'border-line-strong text-fg hover:bg-s2' : 'border-line text-muted hover:bg-s2 hover:text-fg'}`}
            >
              <span
                aria-hidden
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${on ? 'bg-accent text-on-accent' : 'bg-s3 text-muted'}`}
              >
                {i + 1}
              </span>
              {s.title}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${active}`}
        tabIndex={0}
        className="mt-4 rounded-lg border border-line bg-s1 p-6"
      >
        <p className="text-sm text-muted">
          Step {active + 1} of {steps.length}
        </p>
        <h3 className="mt-1 text-h3">{current?.title}</h3>
        <p className="mt-3 max-w-prose text-muted">{current?.text}</p>
      </div>
    </div>
  );
}
