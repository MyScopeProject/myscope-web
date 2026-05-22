// Short promo/info messages shown in the moving top bar (above the navbar).
// Keep them brief — they scroll continuously.
const MESSAGES = [
  "Discover live events across Sri Lanka",
  "Entertain In A Perfect Scope",
  "Concerts · Theatre · Sports · and more",
  "Are you an organizer? Sell tickets on MyScope",
]

// Auto-scrolling announcement strip above the navbar. The track renders the
// messages twice and translates -50% (see --animate-marquee in globals.css),
// so it loops seamlessly. Pauses on hover; respects prefers-reduced-motion.
//
// Colours come entirely from theme tokens (bg-primary / primary-foreground /
// border), so the bar adapts automatically to light and dark mode and stays
// consistent with the rest of the site's design system.
export function AnnouncementBar() {
  return (
    <div className="w-full overflow-hidden border-b border-border bg-primary text-primary-foreground">
      <div className="flex w-max animate-marquee whitespace-nowrap py-2 hover:paused motion-reduce:animate-none">
        {/* Two identical sets back-to-back for the seamless -50% loop. */}
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1}>
            {MESSAGES.map((msg, i) => (
              <span key={`${copy}-${i}`} className="flex items-center">
                <span className="text-[11px] font-semibold uppercase tracking-wider sm:text-xs">
                  {msg}
                </span>
                <span className="mx-5 text-primary-foreground/45" aria-hidden>
                  &bull;
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
