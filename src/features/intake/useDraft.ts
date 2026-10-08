import { useCallback, useEffect, useRef, useState } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';

/** Fields that must never be written to the browser: consent must be given fresh, the rest are anti-spam internals. */
const NEVER_SAVE = new Set(['consent', 'website', 'startedAt', 'turnstileToken']);

export type DraftState = 'idle' | 'restored' | 'saved' | 'unavailable';

/**
 * Saves form values to this device only (localStorage), debounced, and restores them on return.
 * Storage can be blocked or full, so every access is guarded and failure is reported, not hidden.
 */
export function useDraft<T extends FieldValues>(key: string, form: UseFormReturn<T>, enabled: boolean) {
  const [state, setState] = useState<DraftState>('idle');
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<T>;
      for (const k of Object.keys(saved)) if (NEVER_SAVE.has(k)) delete saved[k];
      if (Object.keys(saved).length) {
        form.reset({ ...form.getValues(), ...saved });
        setState('restored');
      }
    } catch {
      setState('unavailable');
    }
  }, [key, form]);

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sub = form.watch((values) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          const out: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(values))
            if (!NEVER_SAVE.has(k) && v !== '' && v !== undefined) out[k] = v;
          window.localStorage.setItem(key, JSON.stringify(out));
          setState('saved');
        } catch {
          setState('unavailable');
        }
      }, 600);
    });
    return () => {
      clearTimeout(timer);
      sub.unsubscribe();
    };
  }, [key, form, enabled]);

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* nothing to clear */
    }
    setState('idle');
  }, [key]);

  return { state, clear };
}
