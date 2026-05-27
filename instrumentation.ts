/**
 * Next.js server-side instrumentation hook. Called once when the server boots
 * (Node + edge runtimes both call this — we dispatch by runtime). Loads the
 * relevant Sentry config file at startup so `Sentry.captureException` works
 * inside Server Components, route handlers, and middleware.
 *
 * Companion client-side init lives in `instrumentation-client.ts` — Next.js
 * loads that automatically in the browser.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Forward request errors thrown by React Server Components and Route Handlers
// to Sentry. Next.js expects an `onRequestError` export here; @sentry/nextjs
// ships the implementation under `captureRequestError`, re-exported with
// the name Next.js looks for.
export { captureRequestError as onRequestError } from '@sentry/nextjs';
