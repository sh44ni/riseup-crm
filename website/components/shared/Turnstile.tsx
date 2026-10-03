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

  useEffect(() => {
    // 1. Check if Turnstile script is already present
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
      }
    };

    if (window.turnstile) {
      setLoaded(true);
    } else {
      script.addEventListener('load', checkReady);
    }

    return () => {
      if (script) {
        script.removeEventListener('load', checkReady);
      }
    };
  }, []);

  useEffect(() => {
    if (!loaded || !containerRef.current || !window.turnstile) return;

    // Avoid duplicate render
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        // Ignore
      }
    }

    try {
      const id = window.turnstile.render(containerRef.current, {
        sitekey: DEFAULT_SITE_KEY,
        callback: (token: string) => {
          onVerify(token);
        },
        'error-callback': (code?: string) => {
          if (onError) onError(code);
        },
        'expired-callback': () => {
          if (onExpire) onExpire();
        },
        theme,
        size: 'flexible',
      });
      widgetIdRef.current = id;
    } catch {
      // Graceful fallback
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [loaded, theme, onVerify, onError, onExpire]);

  return (
    <div
      ref={containerRef}
      className={`min-h-[65px] flex items-center justify-center my-2 ${className}`}
      data-testid="turnstile-container"
    />
  );
}

export default Turnstile;
