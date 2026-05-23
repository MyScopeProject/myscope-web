import type { Metadata } from "next"
import { Mail, MessageCircle, MapPin } from "lucide-react"

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the MyScope team — email, WhatsApp, and support for event-goers and organizers in Sri Lanka.",
  alternates: { canonical: "https://www.myscope.lk/contact" },
}

const WHATSAPP = "94764829645"

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
          className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="h-5 w-5" />
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
          className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <MessageCircle className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-foreground">WhatsApp</span>
            <span className="block text-sm text-muted-foreground">+94 76 482 9645</span>
          </span>
        </a>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-border bg-card p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MapPin className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block font-semibold text-foreground">Based in Sri Lanka</span>
          <span className="block text-sm text-muted-foreground">
            Serving event-goers and organizers island-wide.
          </span>
        </span>
      </div>
    </div>
  )
}
