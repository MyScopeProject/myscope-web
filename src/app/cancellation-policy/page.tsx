import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Cancellation Policy",
  description: "How event cancellations, postponements, and ticket cancellations work on MyScope.",
  alternates: { canonical: "https://www.myscope.lk/cancellation-policy" },
}

// Two distinct cancellation flows live here:
//   - Organizer cancels an event (refund flow kicks in — see refund-policy)
//   - Customer cancels their booking (subject to organizer rules)
//
// Postponement is a third state — not a cancellation, but it gives the customer
// the right to request a refund if the new date doesn't work for them.
const SECTIONS: { h: string; p: string[] }[] = [
  {
    h: "1. Summary",
    p: [
      "This policy covers three situations: (a) the event is cancelled by the organizer, (b) the event is postponed by the organizer, and (c) you wish to cancel your own booking. The rights and outcomes for each are different — see the relevant section below.",
    ],
  },
  {
    h: "2. If the organizer cancels the event",
    p: [
      "We will notify you by email and SMS as soon as the cancellation is confirmed. You will receive a full refund of the ticket price under our Refund Policy. No action is required from you to claim the refund — we initiate it automatically. Refunds are processed within 5 business days of cancellation, and typically reach your card within 7–14 business days.",
    ],
  },
  {
    h: "3. If the organizer postpones the event",
    p: [
      "We will notify you by email and SMS with the new date (or 'date to be announced' if the new date is not yet set). Your existing ticket remains valid for the new date by default — you do not need to re-book.",
      "If the new date does not work for you, you may request a full refund within 7 days of the new date being announced. After 7 days, the ticket is treated as confirmed for the new date and refunds become subject to the organizer's discretion (see Refund Policy §3).",
    ],
  },
  {
    h: "4. If the organizer changes the venue, date, or lineup",
    p: [
      "If the event is materially changed (different venue, different date for non-postponed changes, or significantly different lineup), you may request a full refund within 7 days of the change being announced. Minor changes (e.g. a single supporting artist, a slight start-time shift) do not entitle you to a refund.",
    ],
  },
  {
    h: "5. If you wish to cancel your own booking",
    p: [
      "Whether you can cancel your own booking depends on the event organizer's policy, which is shown on the event page at the time of purchase. By default, ticket sales are final and customer-initiated cancellations are not eligible for a refund.",
      "You may always remove a booking from your account view, but doing so does not entitle you to a refund unless the organizer has explicitly offered one for that event.",
    ],
  },
  {
    h: "6. Complimentary / invitation tickets",
    p: [
      "Tickets issued as complimentary invitations by the event organizer have no monetary value and are not eligible for refund or cash exchange. If the event is cancelled, the invitation is simply void.",
    ],
  },
  {
    h: "7. Group bookings",
    p: [
      "If you purchased multiple tickets in a single booking and the event is cancelled or postponed, the refund or transfer applies to the full booking. Partial cancellations of group bookings are at the organizer's discretion.",
    ],
  },
  {
    h: "8. Notification channels",
    p: [
      "Cancellation and postponement notifications are sent to the email address and phone number provided at checkout. Please ensure both are accurate. We are not responsible if a notification does not reach you because contact details were incorrect, your inbox was full, or your SMS gateway blocked the message — although the refund or rescheduling stands regardless.",
    ],
  },
  {
    h: "9. Contact",
    p: ["Questions or need to request a cancellation refund? Email hello@myscope.lk."],
  },
]

export default function CancellationPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Cancellation Policy</h1>
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
