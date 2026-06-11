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

// Hardcoded fallback DSN — see instrumentation-client.ts header.
const dsn = process.env.SENTRY_DSN
  || process.env.NEXT_PUBLIC_SENTRY_DSN
  || 'https://91f7e265ca5b691c08e3dd69500cedf7@o4511461186732032.ingest.us.sentry.io/4511461349785600';

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE || process.env.NEXT_PUBLIC_SENTRY_RELEASE,

    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 1.0,
    sendDefaultPii: false,
  });
}
