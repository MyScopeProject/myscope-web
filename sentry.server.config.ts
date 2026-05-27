/**
 * Server-side Sentry init for the Node runtime. Loaded by instrumentation.ts
 * when NEXT_RUNTIME === 'nodejs'. Captures errors thrown inside Server
 * Components, route handlers, and any server-only code.
 *
 * Mirrors the posture in `myscope-api/instrumentation.js` — no DSN = no-op.
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE || process.env.NEXT_PUBLIC_SENTRY_RELEASE,

    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    sendDefaultPii: false,

    // Don't page on transient network failures from upstream APIs. Real bugs
    // will still surface — these are the noisy edges.
    ignoreErrors: [
      /AbortError/i,
      /Failed to fetch/i,
      /NEXT_REDIRECT/i,
      /NEXT_NOT_FOUND/i,
    ],

    beforeSend(event) {
      // Strip the request body for the same reason as the API — checkout
      // payloads can carry guest tokens and email addresses we don't want
      // sitting in Sentry forever.
      if (event.request?.data && typeof event.request.data === 'object') {
        for (const key of ['password', 'token', 'guestToken', 'otp']) {
          // @ts-expect-error — Sentry types data as unknown
          if (key in event.request.data) event.request.data[key] = '[scrubbed]';
        }
      }
      if (event.request?.cookies) {
        event.request.cookies = { __scrubbed: '[hidden]' };
      }
      return event;
    },
  });
}
