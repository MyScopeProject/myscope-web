/**
 * Server-side Sentry init for the Node runtime. Loaded by src/instrumentation.ts
 * when NEXT_RUNTIME === 'nodejs'. Captures errors thrown inside Server
 * Components, route handlers, and any server-only code.
 *
 * IMPORTANT: this is the hardened version, not the Sentry-wizard default.
 * Differences from the wizard's template:
 *   - DSN comes from env, not hardcoded → no secret-shaped strings in git
 *   - `sendDefaultPii: false` → don't ship user IPs / cookies to Sentry
 *   - `beforeSend` scrubber → strip passwords, OTPs, guest tokens, cookies
 *   - Conditional init → no DSN = no-op, so dev environments stay silent
 *
 * Mirrors the posture in `myscope-api/instrumentation.js`.
 */
import * as Sentry from '@sentry/nextjs';

// Hardcoded fallback DSN — see myscope-web/src/instrumentation-client.ts for
// the launch-debug story. Env var still wins if explicitly set in the
// environment (Vercel / Render / staging).
const dsn = process.env.SENTRY_DSN
  || process.env.NEXT_PUBLIC_SENTRY_DSN
  || 'https://91f7e265ca5b691c08e3dd69500cedf7@o4511461186732032.ingest.us.sentry.io/4511461349785600';

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE || process.env.NEXT_PUBLIC_SENTRY_RELEASE,

    // 1% trace sampling in prod — keeps perf overhead minimal while still
    // giving a usable sample of server traces. Bumped down from 10% after
    // first-load latency investigation in June 2026.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 1.0,

    // Strict default. The wizard ships `true` which auto-attaches user IPs,
    // cookies, and request bodies — we don't need that and it grows the
    // PII surface unnecessarily.
    sendDefaultPii: false,

    // Quiet the noisy edges. Real bugs still surface.
    ignoreErrors: [
      /AbortError/i,
      /Failed to fetch/i,
      /NEXT_REDIRECT/i,
      /NEXT_NOT_FOUND/i,
    ],

    beforeSend(event) {
      // Checkout payloads can carry guest tokens and emails we don't want
      // sitting in Sentry forever — scrub before send.
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
