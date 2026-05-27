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
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Suppress upload chatter outside CI; we'll see failures regardless.
  silent: !process.env.CI,

  // Tunnel Sentry traffic through /monitoring on our domain, sidestepping
  // browser ad blockers that would otherwise drop requests to sentry.io.
  tunnelRoute: "/monitoring",

  // Upload then delete source maps so they aren't shipped to browsers.
  sourcemaps: { disable: false, deleteSourcemapsAfterUpload: true },

  // We have no cron-style ISR routes yet; off keeps the bundle slimmer.
  // Lives under `webpack` in v10 — top-level was deprecated.
  webpack: { automaticVercelMonitors: false },
});
