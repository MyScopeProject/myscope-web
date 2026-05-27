/**
 * Edge-runtime Sentry init for myscope-web. Loaded by src/instrumentation.ts
 * when NEXT_RUNTIME === 'edge' — covers middleware + any handler that opts
 * into the edge runtime. The edge environment is V8-isolate, so the SDK
 * ships a slimmer init surface and fewer integrations are available.
 *
 * Hardened over the Sentry-wizard default: env-based DSN (not hardcoded)
 * and `sendDefaultPii: false`.
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
  });
}
