// Shared nav list — lives in a plain (non-"use client") module so BOTH the
// client SiteHeader and the server-rendered homepage quick-nav strip can import
// the actual array. Exporting it from the "use client" header instead turned it
// into a client module reference (undefined at runtime in a server component),
// which crashed the homepage with `NAV_ITEMS.map is not a function`.
import { Drama, Music2, ShoppingBag, Ticket, Trophy } from "lucide-react"

// Categories map to /events?category=<X>. The Shop entry is a top-level link
// to /shop (not an event category) so we mark it specially in the active check.
export const NAV_ITEMS = [
  { href: "/events?category=Events", label: "Events", icon: Ticket, category: "Events" },
  { href: "/events?category=Concerts", label: "Concerts", icon: Music2, category: "Concerts" },
  { href: "/events?category=Theatre", label: "Theatre", icon: Drama, category: "Theatre" },
  { href: "/events?category=Sports", label: "Sports", icon: Trophy, category: "Sports" },
  { href: "/shop", label: "Shop", icon: ShoppingBag, category: "__shop" },
]
