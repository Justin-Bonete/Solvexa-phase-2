import { useEffect, useRef } from 'react';

const SITE_KEY = import.meta.env?.VITE_TURNSTILE_SITE_KEY as string | undefined;
type TurnstileApi = {
  render: (el: HTMLElement, o: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export const turnstileEnabled = Boolean(SITE_KEY);

/**
 * Cloudflare Turnstile widget. Renders nothing unless VITE_TURNSTILE_SITE_KEY is set.
 * NOTE: written to Cloudflare's documented explicit-render API but not exercised against the live service.
 */
export function Turnstile({ onToken }: { onToken: (token: string | undefined) => void }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!SITE_KEY || !host.current) return;
    let widget: string | undefined;
    let cancelled = false;
    const mount = () => {
      if (cancelled || !host.current || !window.turnstile) return;
      widget = window.turnstile.render(host.current, {
        sitekey: SITE_KEY,
        callback: (t: string) => onToken(t),
        'expired-callback': () => onToken(undefined),
        'error-callback': () => onToken(undefined),
      });
    };
    if (window.turnstile) mount();
    else {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = mount;
      document.head.appendChild(s);
    }
    return () => {
      cancelled = true;
      if (widget && window.turnstile) window.turnstile.remove(widget);
    };
  }, [onToken]);
  if (!SITE_KEY) return null;
  return <div ref={host} aria-label="Bot check" />;
}
