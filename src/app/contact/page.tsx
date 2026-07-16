import type { Metadata } from "next"
import { SiGmail, SiWhatsapp, SiGooglemaps } from "react-icons/si"

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the MyScope team — email, WhatsApp, and support for event-goers and organizers in Sri Lanka.",
  alternates: { canonical: "https://www.myscope.lk/contact" },
}

const WHATSAPP = "94764670645"

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Contact us</h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        We&rsquo;re here to help — whether you&rsquo;re booking tickets or hosting an event. Reach us
        through any of the channels below and we&rsquo;ll get back to you as soon as we can.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <a
          href="mailto:hello.myscope@gmail.com"
          className="flex items-start gap-3 rounded-2xl border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm p-5 transition-colors hover:border-primary/40"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EA4335]/10 text-[#EA4335]">
            <SiGmail className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-foreground">Email</span>
            <span className="block text-sm text-muted-foreground">hello.myscope@gmail.com</span>
          </span>
        </a>

        <a
          href={`https://wa.me/${WHATSAPP}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 rounded-2xl border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm p-5 transition-colors hover:border-primary/40"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366]/10 text-[#25D366]">
            <SiWhatsapp className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-foreground">WhatsApp</span>
            <span className="block text-sm text-muted-foreground">+94 76 467 0645</span>
          </span>
        </a>
      </div>

      <a
        href="https://www.google.com/maps/search/?api=1&query=Sri+Lanka"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex items-start gap-3 rounded-2xl border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm p-5 transition-colors hover:border-primary/40"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1A73E8]/10 text-[#1A73E8]">
          <SiGooglemaps className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block font-semibold text-foreground">Based in Sri Lanka</span>
          <span className="block text-sm text-muted-foreground">
            Serving event-goers and organizers island-wide.
          </span>
        </span>
      </a>
    </div>
  )
}
