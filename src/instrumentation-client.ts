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

// DSN hardcoded as the source of truth. Sentry DSNs are public-safe (they
// ship to every browser bundle anyway — see
// https://docs.sentry.io/concepts/key-terms/dsn-explainer/#dsn-utilization).
// We previously read from `NEXT_PUBLIC_SENTRY_DSN` and a build-env mismatch
// silently skipped `Sentry.init`, so events vanished for an hour during
// launch. Env var still wins if set, so dev/staging can override.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  || 'https://91f7e265ca5b691c08e3dd69500cedf7@o4511461186732032.ingest.us.sentry.io/4511461349785600';

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
