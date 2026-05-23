import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "About",
  description:
    "MyScope is Sri Lanka's home for live events — discover concerts, theatre, and sports, book tickets securely, and enter with a QR code.",
  alternates: { canonical: "https://www.myscope.lk/about" },
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">About MyScope</h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        MyScope is Sri Lanka&rsquo;s home for live events. We bring concerts, theatre, sports, and
        experiences together in one place — so fans can discover what&rsquo;s on, book tickets in a
        few taps, and walk in with a QR-coded e-ticket.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-foreground">For event-goers</h2>
      <p className="mt-3 text-base leading-relaxed text-muted-foreground">
        Browse upcoming events, pick your seats or tickets, and pay securely. Your tickets arrive
        instantly by email and SMS, ready to scan at the door — no printing, no queues.
      </p>

      <h2 className="mt-8 text-xl font-semibold text-foreground">For organizers</h2>
      <p className="mt-3 text-base leading-relaxed text-muted-foreground">
        Publish your event, sell multi-tier tickets, scan attendees at the gate, and get paid — all
        from one dashboard built for Sri Lankan organizers.{" "}
        <Link href="/become-organizer" className="font-medium text-primary hover:underline">
          Start hosting
        </Link>
        .
      </p>

      <h2 className="mt-8 text-xl font-semibold text-foreground">Get in touch</h2>
      <p className="mt-3 text-base leading-relaxed text-muted-foreground">
        Questions or partnership ideas? Visit our{" "}
        <Link href="/contact" className="font-medium text-primary hover:underline">
          contact page
        </Link>{" "}
        or email{" "}
        <a href="mailto:hello.myscope@gmail.com" className="font-medium text-primary hover:underline">
          hello.myscope@gmail.com
        </a>
        .
      </p>
    </div>
  )
}
