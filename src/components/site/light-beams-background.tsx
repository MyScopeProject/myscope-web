"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

/**
 * LightBeamsBackground — slow, ambient aurora-style sweep behind the page.
 *
 * Three overlapping diagonal beams in the myscope purple/pink palette, each
 * with its own slow keyframe so they drift out of sync (a single shared
 * rotation reads as mechanical). Pure CSS: no JS in the render path beyond
 * the path check, no canvas, no animation library. The blur + low opacity
 * keep it behind content without competing with text or cards.
 *
 * Scope: visitor-facing pages only. Organizer dashboards, admin, the user
 * dashboard, and auth screens stay clean (those pages are dense with data
 * and benefit from no background motion).
 */

// Paths where the beams should NOT render. Anything else gets the effect.
const HIDE_PREFIXES = [
  "/organizer",
  "/admin",
  "/dashboard",
  "/auth",
  "/bookings",
  "/become-organizer",
]

export function LightBeamsBackground() {
  const pathname = usePathname() ?? ""
  // Hide on dense / form-heavy surfaces. Cheap startsWith chain — fine to
  // re-run on every navigation.
  if (HIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null
  }

  return (
    <div
      aria-hidden="true"
      // Fixed so beams stay put while content scrolls. -z-10 sits behind
      // every page section without affecting layout. pointer-events-none
      // so the effect never blocks clicks. The `beam-wrap` class is the
      // hook the light-mode multiply-blend rule targets.
      className="beam-wrap pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Three independently-animated beams. Each beam is a wide diagonal
          stripe with a soft color gradient, blurred heavily so the edges
          melt into the background instead of looking like crisp light bars. */}
      <div className="beam beam-1" />
      <div className="beam beam-2" />
      <div className="beam beam-3" />

      {/* Subtle vignette at the top so navbar text always has enough
          contrast against the brightest beam crossings. */}
      <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-background/40 to-transparent" />

      <style jsx>{`
        .beam {
          position: absolute;
          /* 200% so the beam can travel its full width without ever exposing
             the edge of the gradient. */
          width: 200%;
          height: 60vh;
          /* Heavy blur dissolves the gradient edges into the page background.
             Increasing this beyond ~120px hurts paint perf on low-end mobile;
             ~90px is the sweet spot. */
          filter: blur(90px);
          opacity: 0.55;
          /* Slight horizontal skew so the beam reads as "light" rather than
             a flat stripe. */
          transform-origin: center;
          will-change: transform;
        }

        /* Top-left deep-violet beam, sweeping toward the bottom-right.
           Tailwind violet-700 (#6D28D9) as the core, fading through
           violet-600 (#7C3AED) at the edge so the beam reads as a single
           saturated band rather than a pale lavender wash. */
        .beam-1 {
          top: -10%;
          left: -50%;
          background: linear-gradient(
            105deg,
            transparent 30%,
            rgba(109, 40, 217, 0.65) 48%,
            rgba(124, 58, 237, 0.45) 55%,
            transparent 70%
          );
          animation: sweep-1 22s ease-in-out infinite alternate;
        }

        /* Middle violet beam — darker still (violet-800 #5B21B6) so the
           crossings with beam-1 deepen instead of brightening. */
        .beam-2 {
          top: 25%;
          left: -50%;
          background: linear-gradient(
            85deg,
            transparent 28%,
            rgba(91, 33, 182, 0.55) 50%,
            rgba(76, 29, 149, 0.35) 58%,
            transparent 72%
          );
          animation: sweep-2 30s ease-in-out infinite alternate;
        }

        /* Bottom-right beam — brand purple (#A78BFA) but lower opacity so
           it sits as a subtle highlight against the two darker layers
           above. Gives the aurora some depth without lifting the overall
           palette out of dark-violet territory. */
        .beam-3 {
          top: 55%;
          left: -40%;
          background: linear-gradient(
            120deg,
            transparent 35%,
            rgba(124, 58, 237, 0.5) 52%,
            rgba(167, 139, 250, 0.28) 60%,
            transparent 75%
          );
          animation: sweep-3 36s ease-in-out infinite alternate;
        }

        /* Each beam has its own subtle translate + rotate sweep. ease-in-out
           on alternate produces a slow breathing feel rather than a
           continuous linear drift, which would read as scrolling. */
        @keyframes sweep-1 {
          0%   { transform: translate(-5%, -3%) rotate(-3deg); }
          100% { transform: translate(15%, 5%) rotate(2deg); }
        }
        @keyframes sweep-2 {
          0%   { transform: translate(0%, 0%) rotate(2deg); }
          100% { transform: translate(-12%, -4%) rotate(-3deg); }
        }
        @keyframes sweep-3 {
          0%   { transform: translate(-8%, 0%) rotate(1deg); }
          100% { transform: translate(10%, -6%) rotate(-2deg); }
        }

        /* Respect users who'd rather not have ambient motion. */
        @media (prefers-reduced-motion: reduce) {
          .beam {
            animation: none;
          }
        }

        /* Light mode — switch to multiply blending so the violet gradients
           DARKEN the white background instead of brightening it. With the
           default blend the beams looked washed-out pastel; multiply keeps
           the same dark-violet intensity as dark mode, just rendered as
           shadows on a light canvas. Opacity stays high so the beams read
           as a visible dark-purple gradient, not a faint tint. */
        :global(:root.light) :global(.beam-wrap) {
          mix-blend-mode: multiply;
        }
        :global(:root.light) .beam {
          opacity: 0.7;
        }
      `}</style>
    </div>
  )
}
