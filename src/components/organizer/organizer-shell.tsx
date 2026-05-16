"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Banknote,
  ChevronRight,
  LayoutDashboard,
  Menu,
  Ticket,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

const MENU = [
  { href: "/organizer", label: "Overview", icon: LayoutDashboard },
  { href: "/organizer/events", label: "Events", icon: Ticket },
  { href: "/organizer/payouts", label: "Payouts", icon: Banknote },
]

export function OrganizerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  React.useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const isActive = (href: string) =>
    href === "/organizer" ? pathname === "/organizer" : pathname.startsWith(href)

  return (
    <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-10">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 md:block">
        <div className="sticky top-20 space-y-3">
          <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-xs">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Organizer
            </div>
            <div className="text-sm font-semibold text-foreground">Workspace</div>
          </div>
          <nav className="space-y-1 rounded-xl border border-border bg-card p-2 shadow-xs">
            {MENU.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {active && <ChevronRight className="ml-auto h-3.5 w-3.5" />}
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile drawer */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="fixed bottom-5 right-5 z-30 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
          aria-label="Open organizer menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 flex md:hidden">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <nav className="relative ml-auto flex h-full w-72 flex-col gap-1 border-l border-border bg-card p-4 shadow-xl">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Organizer</span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {MENU.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
