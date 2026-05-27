import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "What cookies MyScope uses, why we use them, and how to control them.",
  alternates: { canonical: "https://www.myscope.lk/cookies" },
}

// MyScope's cookie footprint is small and entirely first-party. We don't run
// third-party advertising trackers, and Sentry's tunnel route keeps even
// error-tracking requests on our own domain. This policy documents:
//   1. The handful of cookies we set (auth, theme, consent if any)
//   2. The third-party scripts/cookies users will encounter at checkout (PayHere)
//   3. How to disable cookies and what breaks if you do
const SECTIONS: { h: string; p: string[] }[] = [
  {
    h: "1. What cookies are",
    p: [
      "Cookies are small text files stored in your browser by websites you visit. They let sites remember information about you across visits — for example, keeping you logged in or remembering your theme preference. Local storage and session storage are similar technologies; this policy covers all three together.",
    ],
  },
  {
    h: "2. Cookies we set on myscope.lk",
    p: [
      "Authentication: a 'token' cookie that keeps you logged in after you sign up or sign in. It expires 7 days after you log in, or sooner if you log out. Without it, you would have to log in on every page reload.",
      "Theme preference: stored in local storage so the site can paint with your chosen light/dark mode before the page renders (preventing a colour flash). No personal information is stored.",
      "Cart / checkout state: temporary keys used while you're in the middle of buying tickets, so a page refresh doesn't lose your selection. Cleared when checkout finishes or you leave the site.",
    ],
  },
  {
    h: "3. Cookies on admin.myscope.lk",
    p: [
      "The admin panel uses the same authentication cookie as the main site. It is only relevant to MyScope team members and approved organizers.",
    ],
  },
  {
    h: "4. Third-party cookies you may encounter",
    p: [
      "When you proceed to payment, you are redirected to our payment partner (PayHere) which sets its own cookies on its domain to process the transaction securely. We do not control these cookies. See payhere.lk for their privacy practices.",
      "If you sign in with Google, Google may set cookies during the OAuth flow on its own domain (accounts.google.com). We receive only the verified email address back, not your Google cookies.",
    ],
  },
  {
    h: "5. Analytics and tracking",
    p: [
      "We do not run third-party advertising trackers (no Google Analytics, no Facebook Pixel, no LinkedIn Insight). Error-reporting requests (which help us fix bugs you encounter) are routed through our own domain rather than directly to a third-party service.",
    ],
  },
  {
    h: "6. How to disable cookies",
    p: [
      "You can disable cookies in your browser settings. If you do, you will not be able to log into MyScope and most features will not work — the authentication cookie is required for any account action. You can still browse public event pages.",
      "Most modern browsers also let you delete cookies for specific sites. Doing this for myscope.lk will log you out and reset your preferences, but will not delete your account or bookings.",
    ],
  },
  {
    h: "7. Do Not Track",
    p: [
      "We honour the Do Not Track header where it makes sense — since we do not track you across sites, there is no third-party tracking to disable. Authentication and functional cookies are not affected by DNT.",
    ],
  },
  {
    h: "8. Changes to this policy",
    p: [
      "When we add new cookies or change how existing ones work, we will update this page and the 'Last updated' date below. Material changes will also be announced via a notice on the homepage.",
    ],
  },
  {
    h: "9. Contact",
    p: ["Questions about cookies? Email hello@myscope.lk."],
  },
]

export default function CookiePolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Cookie Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: 27 May 2026</p>

      <div className="mt-8 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.h}>
            <h2 className="text-lg font-semibold text-foreground">{s.h}</h2>
            {s.p.map((para, i) => (
              <p key={i} className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {para}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
