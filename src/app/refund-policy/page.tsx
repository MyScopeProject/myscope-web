import type { Metadata } from "next"

export const metadata: Metadata = {
  title: { absolute: "Refund Policy | MyScope Event Tickets" },
  description:
    "When you're entitled to a refund, when it's at the organizer's discretion, how long refunds take, and how to request one on MyScope.",
  alternates: { canonical: "https://www.myscope.lk/refund-policy" },
  openGraph: {
    title: "Refund Policy | MyScope Event Tickets",
    description:
      "When you're entitled to a refund, when it's at the organizer's discretion, how long refunds take, and how to request one on MyScope.",
    url: "https://www.myscope.lk/refund-policy",
    type: "website",
  },
}

// MyScope-side refund policy. Sri Lanka has no central consumer-protection
// requirement on online ticket refunds, so this policy is shaped by:
//   - Seylan MPGS's live-merchant onboarding (requires a published refund policy)
//   - Industry norm in LK (event organizers set their own no-refund stance)
//   - Practical reality (we're the platform, not the organizer)
//
// Key stance: refunds are at the organizer's discretion EXCEPT when the
// event is cancelled or materially changed — in which case MyScope guarantees
// the refund regardless of what the organizer says.
const SECTIONS: { h: string; p: string[] }[] = [
  {
    h: "1. Summary",
    p: [
      "All ticket sales are final, except in the specific situations described below. Refund decisions for change-of-mind requests rest with the event organizer; MyScope facilitates the refund once the organizer approves it. When an event is cancelled or materially changed by the organizer, MyScope guarantees a full refund.",
    ],
  },
  {
    h: "2. When you are entitled to a full refund",
    p: [
      "You will receive a full refund of the ticket price (excluding any non-refundable booking fee, where disclosed) in the following cases:",
      "• The event is cancelled by the organizer and not rescheduled.",
      "• The event is postponed and the new date does not work for you (you must notify us within 7 days of the new date being announced).",
      "• The event's venue, date, or main lineup is materially changed and you no longer wish to attend (notify us within 7 days of the change being announced).",
      "• A duplicate booking occurred due to a technical issue on our side (notify us within 14 days of purchase).",
    ],
  },
  {
    h: "3. When refunds are at the organizer's discretion",
    p: [
      "For all other requests, including change of mind, inability to attend, illness, travel changes, or external disruptions outside the organizer's control, the refund decision rests with the event organizer. MyScope will pass your request to the organizer; if they approve, we will process the refund. We cannot guarantee a refund in these cases.",
    ],
  },
  {
    h: "4. How long refunds take",
    p: [
      "Approved refunds are initiated within 5 business days of approval. The funds typically reach your card or bank account within 7–14 business days after we initiate, depending on your bank and our payment partner (Seylan MPGS). For prepaid or virtual cards, your bank may take longer.",
    ],
  },
  {
    h: "5. How to request a refund",
    p: [
      "For ticket bookings, the fastest way to request a refund is the 'Request refund' button on your booking's page in My Bookings, which submits your request directly to our team for review. You can also email hello@myscope.lk with the subject line 'Refund - [booking reference]' and include: your name, the booking reference shown on your e-ticket, the event name, and the reason for the request. Either way, we review requests within 2-3 business days.",
    ],
  },
  {
    h: "6. Shop orders (physical products)",
    p: [
      "Shop orders are sold by the organizer or vendor listing the product, reviewed by MyScope before going live. Refunds or exchanges for a shop order (e.g. a defective, wrong, or undelivered item) are at the seller's discretion, in line with the return policy shown on the product page at the time of purchase. Contact hello@myscope.lk with your order reference if you need help reaching the seller or escalating an issue.",
    ],
  },
  {
    h: "7. Booking fees and add-ons",
    p: [
      "Where a non-refundable booking fee is shown at checkout, that fee is retained even when the ticket price is refunded. Add-ons such as parking, if offered, follow the refund stance disclosed at the time of purchase.",
    ],
  },
  {
    h: "8. Chargebacks",
    p: [
      "If you raise a chargeback with your bank before contacting us, your account may be suspended pending resolution. We strongly prefer to resolve refund requests directly, so please contact us first.",
    ],
  },
  {
    h: "9. Disputes",
    p: [
      "If you are not satisfied with the outcome of a refund request, you may escalate the matter to our support team at hello@myscope.lk and we will review the case. Final disputes about an organizer's refund decision are between you and the organizer; MyScope's role is to facilitate communication and process approved refunds.",
    ],
  },
  {
    h: "10. Contact",
    p: ["Questions about refunds? Email hello@myscope.lk."],
  },
]

export default function RefundPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Refund Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: 7 August 2026</p>

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
