/**
 * Edge-runtime Sentry init. Loaded by instrumentation.ts when NEXT_RUNTIME
 * is 'edge' — i.e. middleware and any route handler that opts into the edge
 * runtime. The edge environment is V8-isolate, not Node, so the SDK ships
 * a slimmer init surface; fewer integrations exist there.
 *
 * MyScope's middleware is light (just auth-gating on /organizer + /admin),
 * but anything that throws there would happen here.
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
