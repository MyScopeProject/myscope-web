import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import {
  CalendarCheck,
  CreditCard,
  Linkedin,
  MapPin,
  QrCode,
  Smartphone,
  Ticket,
} from "lucide-react"

const FOUNDER_LINKEDIN = "https://www.linkedin.com/in/akila-jayakody-4b0289214/"

export const metadata: Metadata = {
  title: "About",
  description:
    "MyScope is Sri Lanka’s Smartest Ticket Booking Platform — built by Akila Jayakody to make discovering, booking, and attending concerts, theatre, and sports effortless across the island.",
  alternates: { canonical: "https://www.myscope.lk/about" },
  openGraph: {
    title: "About MyScope — Sri Lanka's Smartest Event Ticket booking Platform",
    description:
      "How MyScope works, what we've built, and the story behind it.founded by Akila Jayakody, a Sri Lankan Data engineer building for the local events industry.",
    url: "https://www.myscope.lk/about",
    type: "website",
  },
}

// JSON-LD on the About page links the brand to its founder so Google can
// associate "Akila Jayakody" with MyScope in the knowledge graph. The same
// `Person` block is referenced by Organization.founder.
const founderJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Akila Jayakody",
  jobTitle: "Founder & Data Engineer",
  worksFor: {
    "@type": "Organization",
    name: "MyScope",
    url: "https://www.myscope.lk",
  },
  alumniOf: {
    "@type": "CollegeOrUniversity",
    name: "University of Colombo",
  },
  nationality: "Sri Lankan",
  description:
    "Founder of MyScope, a Sri Lankan live events platform. BSc in Computer Science from the University of Colombo. Solo founder and engineer building MyScope end to end.",
  url: "https://www.myscope.lk/about",
  sameAs: [FOUNDER_LINKEDIN],
}

const orgWithFounderJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "MyScope",
  url: "https://www.myscope.lk",
  logo: "https://www.myscope.lk/Images/logo.png",
  foundingDate: "2026",
  foundingLocation: "Colombo, Sri Lanka",
  founder: {
    "@type": "Person",
    name: "Akila Jayakody",
    jobTitle: "Founder & Data Engineer",
    alumniOf: "University of Colombo",
    sameAs: [FOUNDER_LINKEDIN],
  },
  areaServed: "LK",
  description:
    "Sri Lanka's Smartest Event Ticket booking Platform — concerts, theatre, sports, and experiences. Discover events, book tickets, and walk in with a QR coded e ticket.",
}

const platformFeatures = [
  {
    icon: Ticket,
    title: "Every kind of ticketing",
    body:
      "General admission, free seating, zoned tiers, and full reserved seating with a visual seat map — one platform handles every venue layout.",
  },
  {
    icon: QrCode,
    title: "QR-coded e-tickets",
    body:
      "Tickets arrive by email and SMS the moment payment clears. Organizers scan them at the gate with our mobile app — no printing, no queues.",
  },
  {
    icon: CreditCard,
    title: "Secure local payments",
    body:
      "Card payments built for Sri Lanka, with automatic refund flows, transparent receipts, and bank payouts on a predictable schedule.",
  },
  {
    icon: CalendarCheck,
    title: "An organizer dashboard that works",
    body:
      "Publish events, edit live listings through a moderated approval flow, track sales in real time, manage staff scanners, and export attendee lists.",
  },
  {
    icon: Smartphone,
    title: "Mobile apps for everyone",
    body:
      "A consumer app for fans on iOS and Android, plus a dedicated organizer + scanner app — the same MyScope experience, native on every device.",
  },
  {
    icon: MapPin,
    title: "Built for Sri Lanka",
    body:
      "Designed around how Sri Lankan venues, organizers, and audiences actually operate — not a foreign product translated and resold.",
  },
]

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(founderJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgWithFounderJsonLd) }}
      />

      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-wider text-primary">
          About MyScope
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
          Sri Lanka&rsquo;s Smartest Event Ticket booking Platform.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
          MyScope brings concerts, theatre, sports, and experiences together in one place
          so fans across the island can discover what&rsquo;s on, book tickets in a few taps,
          and walk in with a QR coded e ticket. We&rsquo;re building the modern ticketing
          layer Sri Lanka&rsquo;s events industry has been missing.
        </p>
      </section>

      {/* What we've built */}
      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          What we&rsquo;ve built
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground">
          MyScope is a complete, end to end events platform not just a booking page.
          Every part of the experience, from discovery to check-in to payouts, runs on
          software we built ourselves.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {platformFeatures.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.body}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* For event-goers / organizers */}
      <section className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold text-foreground">For event-goers</h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Browse upcoming events, pick your seats or tickets, and pay securely. Your
            tickets arrive instantly by email and SMS, ready to scan at the door no
            printing, no queues.
          </p>
          <Link
            href="/events"
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            Browse events &rarr;
          </Link>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">For organizers</h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Publish your event, sell multi tier tickets, scan attendees at the gate, and
            get paid — all from one dashboard built for Sri Lankan organizers.
          </p>
          <Link
            href="/become-organizer"
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            Start hosting &rarr;
          </Link>
        </div>
      </section>

      {/* Founder */}
      <section className="mt-20 rounded-3xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm sm:p-10">
        <p className="text-sm font-medium uppercase tracking-wider text-primary">
          Meet the founder
        </p>
        <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-[260px_1fr] sm:items-start sm:gap-10">
          <div className="relative mx-auto aspect-4/5 w-full max-w-[260px] overflow-hidden rounded-2xl border border-border/60 bg-muted/40 shadow-lg sm:mx-0">
            <Image
              src="/Images/akila-jayakody.jpg"
              alt="Akila Jayakody, founder of MyScope"
              fill
              priority
              sizes="(max-width: 640px) 260px, 260px"
              className="object-cover"
            />
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Akila Jayakody
            </h2>
            <p className="mt-1 text-sm font-medium text-primary">
              Founder &amp; Data Engineer
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              BSc in Computer Science, University of Colombo
            </p>

            <div className="mt-5 space-y-4 text-base leading-relaxed text-muted-foreground">
              <p>
                Akila started MyScope with a simple frustration: in a country with a
                vibrant culture of concerts, theatre, and live performance, finding what
                was on and getting a ticket still felt stuck in another decade. He set out
                to build the platform he wished existed a single place where Sri Lankans
                could discover events, organizers could sell tickets without friction, and
                everyone could walk into a venue with nothing but a phone.
              </p>
              <p>
                MyScope is engineered by Akila Jayakody. The consumer web
                app, the organizer dashboard, the mobile apps, the
                payments layer, the QR check in scanner, the visual reserved seating
                builder, the admin moderation tooling: every piece is something he
                designed, wrote, and shipped himself. It&rsquo;s a one person engineering
                effort with the surface area of a much larger company &mdash; deliberately,
                because moving fast on local feedback matters more here than headcount.
              </p>
              <p>
                The bigger ambition is to become the default events infrastructure for Sri
                Lanka the rails that local promoters, theatres, festivals, and venues
                run on. Open to organizers of any size, fair on fees, and built for how
                the Sri Lankan market actually works. MyScope is the start; the goal is a
                live events ecosystem the country can build on for the next decade.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
              <a
                href={FOUNDER_LINKEDIN}
                target="_blank"
                rel="noopener noreferrer me"
                className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-1.5 font-medium text-foreground transition hover:border-primary/60 hover:text-primary"
              >
                <Linkedin className="h-4 w-4" aria-hidden />
                LinkedIn
              </a>
              <a
                href="mailto:hello.myscope@gmail.com"
                className="font-medium text-primary hover:underline"
              >
                nishanakila10@gmail.com
              </a>
              <span aria-hidden className="text-muted-foreground/40">
                &bull;
              </span>
              <Link
                href="/contact"
                className="font-medium text-primary hover:underline"
              >
                Contact MyScope
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Get in touch */}
      <section className="mt-16 max-w-3xl">
        <h2 className="text-xl font-semibold text-foreground">Get in touch</h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Questions, press, or partnership ideas? Visit our{" "}
          <Link href="/contact" className="font-medium text-primary hover:underline">
            contact page
          </Link>{" "}
          or email{" "}
          <a
            href="mailto:hello.myscope@gmail.com"
            className="font-medium text-primary hover:underline"
          >
            hello.myscope@gmail.com
          </a>
          .
        </p>
      </section>
    </div>
  )
}
