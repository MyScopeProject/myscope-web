import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms governing your use of MyScope and the purchase of tickets.",
  alternates: { canonical: "https://www.myscope.lk/terms" },
}

const SECTIONS: { h: string; p: string[] }[] = [
  {
    h: "1. Overview",
    p: [
      "MyScope is an online platform that lets users discover events and purchase tickets, buy merchandise from the MyScope shop, and lets organizers publish and manage events and shop listings. By accessing or using MyScope, you agree to these Terms & Conditions.",
    ],
  },
  {
    h: "2. Accounts",
    p: [
      "You are responsible for the accuracy of the information you provide and for activity under your account. Keep your login details secure. You may also check out as a guest for general-admission events.",
    ],
  },
  {
    h: "3. Tickets & payments",
    p: [
      "Ticket prices are set by the event organizer and shown at checkout. Payments are processed securely through our payment partner (Seylan MPGS). A booking is only confirmed once payment is successfully completed. Your e-ticket and QR code are issued to the email and phone number provided at checkout.",
    ],
  },
  {
    h: "4. Refunds, cancellations & postponements",
    p: [
      "If an event is cancelled, confirmed bookings are queued for a refund. If an event is postponed, your existing tickets remain valid for the new date unless stated otherwise. Other refund requests are reviewed on a case-by-case basis in line with the organizer's policy. Refunds are returned to the original payment method. Shop orders follow the separate Refund Policy for physical products.",
    ],
  },
  {
    h: "5. Shop orders",
    p: [
      "Products sold through the MyScope shop are listed and fulfilled by the event organizer or vendor account selling them, and are reviewed by MyScope before going live. Payments are processed through the same payment partner as ticket purchases. Depending on the product, fulfillment is by shipping to the address you provide at checkout or by pickup at a location specified by the seller. MyScope facilitates the transaction but is not the seller of record for organizer-listed products.",
    ],
  },
  {
    h: "6. Entry & conduct",
    p: [
      "Entry requires a valid ticket (QR code) and may require photo ID. Organizers and venues may set additional rules. MyScope is not responsible for an attendee being refused entry for failing to meet event or venue requirements.",
    ],
  },
  {
    h: "7. Organizer & seller responsibilities",
    p: [
      "Organizers are responsible for the accuracy of their event listings and shop products, for delivering the event or product as described, and for complying with applicable laws. MyScope provides the platform but is not the organizer of events or the seller of products listed by third parties.",
    ],
  },
  {
    h: "8. Limitation of liability",
    p: [
      "MyScope provides the platform on an “as is” basis. To the extent permitted by law, MyScope is not liable for losses arising from an organizer's or seller's actions, event changes, product quality or delivery, or circumstances beyond our reasonable control.",
    ],
  },
  {
    h: "9. Changes to these terms",
    p: [
      "We may update these terms from time to time. Continued use of MyScope after changes take effect constitutes acceptance of the updated terms.",
    ],
  },
  {
    h: "10. Contact",
    p: ["Questions about these terms? Email hello@myscope.lk."],
  },
]

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Terms &amp; Conditions
      </h1>
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
