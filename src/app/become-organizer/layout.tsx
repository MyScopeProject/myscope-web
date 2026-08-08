import type { Metadata } from "next"

// page.tsx is a client component, so metadata has to live here — Next.js
// only reads `metadata` exports from Server Components. Without this,
// /become-organizer fell back to the layout's default title/description,
// identical to the homepage's. No nested routes under /become-organizer, so
// this layout only ever applies to this one page.
export const metadata: Metadata = {
  title: "Sell Tickets Online in Sri Lanka — Become an Organizer",
  description:
    "Publish your event, sell multi-tier tickets, scan attendees at the gate, and get paid — all from one organizer dashboard built for Sri Lanka.",
  alternates: { canonical: "https://www.myscope.lk/become-organizer" },
  openGraph: {
    title: "Sell Tickets Online in Sri Lanka — Become an Organizer · MyScope",
    description:
      "Publish your event, sell multi-tier tickets, scan attendees at the gate, and get paid — all from one organizer dashboard built for Sri Lanka.",
    url: "https://www.myscope.lk/become-organizer",
    type: "website",
  },
}

export default function BecomeOrganizerLayout({ children }: { children: React.ReactNode }) {
  return children
}
