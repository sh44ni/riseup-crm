/**
 * Frontend Structured Logger & Sentry Forwarder (WP-6.2)
 * ======================================================
 * Centralizes client-side error/warning logging and forwards events
 * to Sentry when configured. Attaches standard context (timestamp, user_id, requestId).
 */

type LogLevel = "debug" | "info" | "warn" | "error";

let currentUserId: number | string | null = null;

export function setLogUserContext(userId: number | string | null): void {
  currentUserId = userId;
}

function formatError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }
  return { raw: String(err) };
}

function forwardToSentry(
  level: "warn" | "error",
  message: string,
  context?: Record<string, unknown>,
  error?: unknown
): void {
  const win = window as unknown as {
    Sentry?: {
      captureMessage: (msg: string, opts?: { level: string; extra: Record<string, unknown> }) => void;
      captureException: (err: unknown, opts?: { extra: Record<string, unknown> }) => void;
    };
  };

  if (win.Sentry) {
    const extra: Record<string, unknown> = { ...(context || {}), userId: currentUserId };
    if (error) {
      win.Sentry.captureException(error, { extra });
    } else {
      win.Sentry.captureMessage(message, { level, extra });
    }
  }
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    if (import.meta.env.DEV) {
      console.debug(`[DEBUG] ${message}`, context || "");
    }
  },

  info(message: string, context?: Record<string, unknown>): void {
    if (import.meta.env.DEV) {
      console.info(`[INFO] ${message}`, context || "");
    }
  },

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(`[WARN] ${message}`, { ...(context || {}), userId: currentUserId });
    forwardToSentry("warn", message, context);
  },

  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    console.error(`[ERROR] ${message}`, {
      ...(context || {}),
      userId: currentUserId,
      error: error ? formatError(error) : undefined,
    });
    forwardToSentry("error", message, context, error);
  },
};
