'use client';

import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: (code?: string) => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact' | 'flexible';
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

interface TurnstileProps {
  onVerify: (token: string) => void;
  onError?: (errorCode?: string) => void;
  onExpire?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
}

const DEFAULT_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAFLziAlI8W3lPj3O';

export function Turnstile({
  onVerify,
  onError,
  onExpire,
  theme = 'auto',
  className = '',
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Keep latest callbacks in refs so parent form re-renders (e.g. typing in inputs
  // or storing turnstileToken in state) NEVER destroy and re-render the widget!
  const onVerifyRef = useRef(onVerify);
  const onErrorRef = useRef(onError);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onErrorRef.current = onError;
    onExpireRef.current = onExpire;
  }, [onVerify, onError, onExpire]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.turnstile) {
      setLoaded(true);
      return;
    }

    const SCRIPT_ID = 'cf-turnstile-script';
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const checkReady = () => {
      if (window.turnstile) {
        setLoaded(true);
        return true;
      }
      return false;
    };

    script.addEventListener('load', checkReady);

    // Fallback poll in case the script load event already fired before listener attached
    const interval = window.setInterval(() => {
      if (checkReady()) {
        window.clearInterval(interval);
      }
    }, 100);

    return () => {
      if (script) {
        script.removeEventListener('load', checkReady);
      }
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!loaded || !containerRef.current || !window.turnstile) return;

    // Avoid duplicate render if already mounted
    if (widgetIdRef.current !== null) {
      return;
    }

    try {
      const id = window.turnstile.render(containerRef.current, {
        sitekey: DEFAULT_SITE_KEY,
        callback: (token: string) => {
          onVerifyRef.current(token);
        },
        'error-callback': (code?: string) => {
          if (onErrorRef.current) onErrorRef.current(code);
        },
        'expired-callback': () => {
          if (onExpireRef.current) onExpireRef.current();
          if (widgetIdRef.current !== null && window.turnstile) {
            try {
              window.turnstile.reset(widgetIdRef.current);
            } catch {
              // Ignore
            }
          }
        },
        theme,
        size: 'flexible',
      });
      widgetIdRef.current = id;
    } catch {
      // Graceful fallback
    }

    return () => {
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [loaded, theme]);

  return (
    <div
      ref={containerRef}
      className={`min-h-[65px] flex items-center justify-center my-2 ${className}`}
      data-testid="turnstile-container"
    />
  );
}

export default Turnstile;
