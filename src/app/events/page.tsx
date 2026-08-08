import type { Metadata } from "next"
import EventsPageClient from "./events-client"

// The actual page (filters, search, fetching) is a client component — Next.js
// only reads `metadata` from Server Components, so it's split out here. This
// file was previously the client component itself, which meant /events had
// no metadata export at all and fell back to the layout's homepage defaults
// (duplicate title/description, no canonical).
export const metadata: Metadata = {
  title: "Browse Events in Sri Lanka — Concerts, Theatre & Sports",
  description:
    "Find concerts, theatre, and sports events happening across Sri Lanka. Book tickets in a few taps with instant QR e-tickets.",
  alternates: { canonical: "https://www.myscope.lk/events" },
  openGraph: {
    title: "Browse Events in Sri Lanka — Concerts, Theatre & Sports · MyScope",
    description:
      "Find concerts, theatre, and sports events happening across Sri Lanka. Book tickets in a few taps with instant QR e-tickets.",
    url: "https://www.myscope.lk/events",
    type: "website",
  },
}

export default function EventsPage() {
  return <EventsPageClient />
}
