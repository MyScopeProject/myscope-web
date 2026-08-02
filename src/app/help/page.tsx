import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Help center",
  description:
    "Answers to common questions about booking tickets, e-tickets, refunds, and hosting events on MyScope.",
  alternates: { canonical: "https://www.myscope.lk/help" },
}

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do I get my tickets after booking?",
    a: "Your e-tickets are sent to you by email and SMS as soon as your payment is confirmed. Each ticket carries a QR code you scan at the venue — no printing needed.",
  },
  {
    q: "What payment methods are accepted?",
    a: "Payments are processed securely through Seylan Bank's MPGS payment gateway, which supports Visa, Mastercard, and other local options.",
  },
  {
    q: "Can I get a refund?",
    a: "Refunds depend on the event and our refund policy. If an event is cancelled, confirmed bookings are queued for a refund. You can also request a refund from your booking page; our team reviews each request.",
  },
  {
    q: "What happens if an event is postponed?",
    a: "Your existing tickets remain valid for the new date. We notify confirmed attendees by email and SMS with the new date (or that a new date will be announced).",
  },
  {
    q: "I didn't receive my ticket email. What should I do?",
    a: "Check your spam folder first. You can always view and re-download your tickets from your bookings page, or contact us and we'll resend them.",
  },
  {
    q: "How do I host an event on MyScope?",
    a: "Apply to become an organizer, then publish your event, set up ticket tiers, and start selling. You can scan tickets at the gate and get paid through your dashboard.",
  },
]

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Help center</h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        Quick answers to the questions we hear most. Still stuck?{" "}
        <Link href="/contact" className="font-medium text-primary hover:underline">
          Contact us
        </Link>{" "}
        and we&rsquo;ll help.
      </p>

      <dl className="mt-8 divide-y divide-border">
        {FAQS.map((item) => (
          <div key={item.q} className="py-5">
            <dt className="text-base font-semibold text-foreground">{item.q}</dt>
            <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
