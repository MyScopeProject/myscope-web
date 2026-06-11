/**
 * Browser-side Sentry init. Next.js loads this automatically — do not import
 * manually. Lives in `src/` because the project uses the `src/app/` layout;
 * Next.js won't pick it up at the project root in that case.
 *
 * History: previously called `Sentry.replayIntegration(...)` and exported
 * `Sentry.captureRouterTransitionStart` — both undefined in `@sentry/nextjs`
 * v10.54. The replay integration was moved out of the main package in v10,
 * and the router-transition export was renamed/removed. Both undefined calls
 * silently threw during init, so the SDK module loaded (`__SENTRY__` global)
 * but `Sentry.init()` never completed and no client got registered — events
 * vanished. The fix: only call APIs that actually exist on this version.
 *
 * If session replay is wanted later, install `@sentry/browser` separately and
 * import `replayIntegration` from there, OR pin to a v9 Sentry version that
 * exposes it on `@sentry/nextjs`.
 */
import * as Sentry from '@sentry/nextjs';

// DSN hardcoded as the source of truth. Sentry DSNs are public-safe (they
// ship to every browser bundle anyway — see
// https://docs.sentry.io/concepts/key-terms/dsn-explainer/#dsn-utilization).
// Env var still wins if set, so dev/staging can override.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  || 'https://91f7e265ca5b691c08e3dd69500cedf7@o4511461186732032.ingest.us.sentry.io/4511461349785600';

Sentry.init({
  dsn,
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 1.0,
  sendDefaultPii: false,

  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Non-Error promise rejection captured',
    /Failed to fetch/i,
    /NetworkError/i,
    /Load failed/i,
  ],
});

// Next.js prints "ACTION REQUIRED: export onRouterTransitionStart…" on boot
// because the SDK runtime expects this hook. The real helper
// (Sentry.captureRouterTransitionStart) is undefined in @sentry/nextjs v10.54
// — re-introducing it caused the navigation crash documented in
// [[project_sentry_live]]. A no-op stub satisfies the runtime check. Swap to
// the real helper if/when we bump to a version that ships it.
export const onRouterTransitionStart = () => {};
