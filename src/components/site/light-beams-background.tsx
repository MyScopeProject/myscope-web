/**
 * LightBeamsBackground — slow, ambient aurora-style sweep behind the page.
 *
 * Three overlapping diagonal beams in the myscope purple/pink palette, each
 * with its own slow keyframe so they drift out of sync (a single shared
 * rotation reads as mechanical). Pure CSS: the beam styling + keyframes live
 * in globals.css (keyed off .beam-wrap/.beam), so this component is just the
 * markup. The blur + low opacity keep it behind content without competing
 * with text or cards.
 *
 * Scope: renders on every page so the whole app shares the hero's atmospheric
 * dark background. It only shows in dark mode — the `:root.light .beam-wrap`
 * rule in globals.css hides it entirely in light mode. The beams sit at
 * `-z-10` behind all content, so pages with their own opaque surfaces simply
 * cover them; the glow shows through wherever the page is transparent.
 */
export function LightBeamsBackground() {
  return (
    <div
      aria-hidden="true"
      // Fixed so beams stay put while content scrolls. -z-10 sits behind
      // every page section without affecting layout. pointer-events-none
      // so the effect never blocks clicks. The `beam-wrap` class is the
      // hook the light-mode opt-out rule targets.
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
    </div>
  )
}
