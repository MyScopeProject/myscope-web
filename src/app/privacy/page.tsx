import type { Metadata } from "next"

export const metadata: Metadata = {
  title: { absolute: "Privacy Policy | MyScope Ticketing Platform" },
  description:
    "Learn how MyScope collects, uses, and protects your personal information when you book tickets, shop, or host events on the platform.",
  alternates: { canonical: "https://www.myscope.lk/privacy" },
  openGraph: {
    title: "Privacy Policy | MyScope Ticketing Platform",
    description:
      "Learn how MyScope collects, uses, and protects your personal information when you book tickets, shop, or host events on the platform.",
    url: "https://www.myscope.lk/privacy",
    type: "website",
  },
}

const SECTIONS: { h: string; p: string[] }[] = [
  {
    h: "1. Information we collect",
    p: [
      "We collect information you provide when you create an account, book tickets, or order from the MyScope shop, such as your name, email address, phone number, and details about your bookings or orders. If you buy a physical product with shipping delivery, we also collect your delivery address. We also collect limited technical data (such as device and usage information) to operate and improve the service.",
    ],
  },
  {
    h: "2. How we use your information",
    p: [
      "We use your information to process bookings and shop orders, deliver e-tickets, arrange shipping or pickup of physical items, send confirmations and important updates (such as reminders, postponements, cancellations, or delivery status), provide support, and improve MyScope.",
    ],
  },
  {
    h: "3. Payments",
    p: [
      "Payments are processed by our payment partner (Seylan Bank's MPGS payment gateway). We do not store your full card details on our servers; card data is handled by the payment provider under their own security standards.",
    ],
  },
  {
    h: "4. Sharing your information",
    p: [
      "We share necessary booking information with the relevant event organizer so they can manage attendance and contact you about their event. For shop orders, we share your delivery address and order details with the selling organizer (and their courier, where shipping is used) so your order can be fulfilled. We do not sell your personal information. We may share data with service providers (such as email and SMS providers) strictly to deliver the service, and where required by law.",
    ],
  },
  {
    h: "5. Communications",
    p: [
      "We send transactional messages (booking confirmations, ticket delivery, event updates) by email and SMS. These are part of the service for events you have booked.",
    ],
  },
  {
    h: "6. Data retention & security",
    p: [
      "We retain your information for as long as needed to provide the service and meet legal obligations. We use reasonable technical and organizational measures to protect your data, though no method of transmission or storage is completely secure.",
    ],
  },
  {
    h: "7. Your choices",
    p: [
      "You can review and update your account details at any time, and request access to or deletion of your personal information by contacting us, subject to legal and operational requirements.",
    ],
  },
  {
    h: "8. Contact",
    p: ["Questions about your privacy? Email hello@myscope.lk."],
  },
]

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Privacy Policy</h1>
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
