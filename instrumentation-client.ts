/**
 * Browser-side Sentry init. Next.js loads this automatically — do not import
 * it manually. The DSN goes in `NEXT_PUBLIC_SENTRY_DSN` (the NEXT_PUBLIC_
 * prefix ships the value to the browser bundle, which is intentional — DSNs
 * are designed to be public-ish).
 *
 * Note: a stolen DSN can only be used to submit events to your project; it
 * cannot read existing events. Sentry handles inbound-rate limiting and
 * fingerprinting at the org level.
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

    // Performance sampling — 10% in prod (free tier is 5k events/mo; we'd
    // rather burn the quota on errors).
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Replay only kicks in when there's an error, so a 100% error-replay
    // rate doesn't blow the budget — it adds session replays on the cases
    // that need them most.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,

    // Don't auto-attach IP / cookies. Same posture as the API.
    sendDefaultPii: false,

    ignoreErrors: [
      // Common browser noise that's not actionable
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      // Failed-to-fetch from network blips
      /Failed to fetch/i,
      /NetworkError/i,
      /Load failed/i,
    ],

    integrations: [
      Sentry.replayIntegration({
        // Mask anything that could leak PII inside the recorded DOM
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
