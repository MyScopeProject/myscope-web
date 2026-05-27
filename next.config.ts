import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      // Google profile pictures
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Supabase Storage (event banners + any future user avatars)
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
    ],
  },
};

// Sentry build-time wrapper. Uploads source maps so production stack traces
// resolve to readable file:line numbers, then strips the maps from the
// shipped bundle. Source-map upload only runs when SENTRY_AUTH_TOKEN is set
// (Vercel build env); local `next build` is a no-op for that step.
export default withSentryConfig(nextConfig, {
  // Org + project read from env so rotating Sentry slugs (or copying this
  // file to another app) doesn't require a code change. The wizard hardcodes
  // these — we don't.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Suppress upload chatter outside CI; failures still surface.
  silent: !process.env.CI,

  // Upload an extra slice of source maps (Next's _next/static chunks that
  // ship to clients). Adds ~10s to the build but means hover-on-trace in
  // Sentry shows your source lines, not minified bundles. Worth it.
  widenClientFileUpload: true,

  // tunnelRoute was previously "/monitoring" to route browser events through
  // our domain (dodge ad blockers). DISABLED because the generated route
  // handler was returning 404 in production (x-matched-path: /404) — meaning
  // events were being POSTed into a Next.js 404 page and silently lost. With
  // tunnelRoute off, the SDK ships events directly to o4511461186732032.
  // ingest.us.sentry.io which is well-known and works without the proxy.
  // Re-enable once the tunnel route generation works (likely needs a
  // matching middleware.ts allowlist).
  // tunnelRoute: "/monitoring",

  // Upload then delete source maps so they aren't shipped to browsers.
  sourcemaps: { disable: false, deleteSourcemapsAfterUpload: true },

  webpack: {
    // We have no Vercel Cron Monitors; off keeps the webpack pass lean.
    automaticVercelMonitors: false,

    // Strip Sentry's internal debug `logger.*` calls at build time — shaves
    // a few KB off the client bundle.
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
