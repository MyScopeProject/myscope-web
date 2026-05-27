/**
 * Browser-side Sentry init. Next.js loads this automatically — do not import
 * manually. DSN goes in `NEXT_PUBLIC_SENTRY_DSN` (the NEXT_PUBLIC_ prefix
 * ships it to the browser bundle, which is intentional — DSNs are designed
 * to be public-ish).
 *
 * Hardened over the Sentry-wizard default:
 *   - DSN from env, not hardcoded
 *   - `sendDefaultPii: false` so we don't auto-collect user IPs / cookies
 *   - Aggressive replay masking (text + inputs + media)
 *   - Session-replay only on errors, not on every session — controls the
 *     50-replays/mo free-tier quota
 *   - `ignoreErrors` to filter common browser noise (ResizeObserver, etc.)
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    sendDefaultPii: false,

    // No "always-on" replays — only when an error fires. Keeps us inside
    // the 50/mo free quota while still giving us context on real bugs.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,

    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      /Failed to fetch/i,
      /NetworkError/i,
      /Load failed/i,
    ],

    integrations: [
      Sentry.replayIntegration({
        // Mask everything inside the recorded DOM — user names, ticket QR
        // codes, anything that could leak PII into the replay.
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],
  });
}

// Required by Next 15 instrumentation-client API — exposes navigation
// timing data to performance traces.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
