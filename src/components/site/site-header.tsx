"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import {
  Calendar,
  ChevronDown,
  Drama,
  LogOut,
  Menu,
  Music2,
  Search,
  ShoppingBag,
  Ticket,
  Trophy,
  User,
  X,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { cn } from "@/lib/utils"

// Categories map to /events?category=<X>. The Shop entry is a top-level link
// to /shop (not an event category) so we mark it specially in the active check.
const NAV_ITEMS = [
  { href: "/events?category=Events", label: "Events", icon: Ticket, category: "Events" },
  { href: "/events?category=Concerts", label: "Concerts", icon: Music2, category: "Concerts" },
  { href: "/events?category=Theatre", label: "Theatre", icon: Drama, category: "Theatre" },
  { href: "/events?category=Sports", label: "Sports", icon: Trophy, category: "Sports" },
  { href: "/shop", label: "Shop", icon: ShoppingBag, category: "__shop" },
]

export function SiteHeader() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [userMenuOpen, setUserMenuOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const userMenuRef = React.useRef<HTMLDivElement>(null)

  // Close user menu when clicking outside
  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  // Close mobile drawer on route change
  React.useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Body scroll lock + ESC-to-close while the mobile drawer is open
  React.useEffect(() => {
    if (!mobileOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener("keydown", onKey)
    }
  }, [mobileOpen])

  const isActive = (category: string) => {
    if (category === "__shop") return pathname?.startsWith("/shop") ?? false
    if (pathname !== "/events") return false
    return (searchParams?.get("category") ?? "") === category
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    router.push(q ? `/events?search=${encodeURIComponent(q)}` : "/events")
  }

  const handleLogout = () => {
    logout()
    setUserMenuOpen(false)
    router.push("/")
  }

  return (
    <>
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center">
          <Image
            src="/Images/navbar_logo.png"
            alt="MyScope"
            width={220}
            height={64}
            className="h-16 w-auto"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = isActive(item.category)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    // Active chip color tracks the theme: white reads on the
                    // dark navbar, but vanishes on the light one — so light
                    // mode gets the brand violet text/icon, dark mode keeps
                    // the white-on-violet contrast. currentColor cascades to
                    // both the label and the inline SVG icon.
                    ? "bg-primary/10 text-primary dark:text-white"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Search (desktop) */}
        <form onSubmit={handleSearch} className="ml-auto hidden flex-1 max-w-sm md:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search events…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-muted/40 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
            />
          </div>
        </form>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <ThemeToggle />

          {user ? (
            // Account dropdown is desktop-only — on mobile the drawer menu
            // handles dashboard / profile / sign out.
            <div ref={userMenuRef} className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-sm transition-colors hover:bg-muted"
                aria-haspopup="true"
                // ARIA lint plugin false-positives on expression values, but
                // React serializes booleans correctly for aria-expanded.
                // eslint-disable-next-line jsx-a11y/aria-proptypes
                aria-expanded={userMenuOpen}
              >
                <span className="inline-flex h-7 w-7 shrink-0 overflow-hidden rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {user.profileImage ? (
                    <Image
                      src={user.profileImage}
                      alt={user.name ?? "User"}
                      width={28}
                      height={28}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      {user.name?.charAt(0).toUpperCase() ?? "U"}
                    </span>
                  )}
                </span>
                <span className="hidden text-sm font-medium sm:inline">{user.name?.split(" ")[0]}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-56 max-w-[calc(100vw-1rem)] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md">
                  <div className="border-b border-border px-3 py-2">
                    <div className="truncate text-sm font-medium">{user.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                  </div>
                  <div className="py-1">
                    <UserMenuLink href="/dashboard" icon={Calendar}>My Events</UserMenuLink>
                    {(user.role === "organizer" || user.role === "superadmin") && (
                      <UserMenuLink href="/organizer" icon={Ticket}>Organizer</UserMenuLink>
                    )}
                    <UserMenuLink href="/dashboard/profile" icon={User}>Profile</UserMenuLink>
                  </div>
                  <div className="border-t border-border py-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center sm:flex">
              <Link
                href="/auth/login"
                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Sign in
              </Link>
            </div>
          )}

          {/* Mobile menu trigger */}
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-muted md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Open menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>

      {/* Mobile drawer — rendered OUTSIDE <header> so its z-50 isn't trapped
          inside the header's sticky/z-40 stacking context. Without this, the
          hero carousel's preserve-3d slides bleed through the drawer. */}
      <div
        className={cn(
          "fixed inset-0 z-50 md:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        role="dialog"
        aria-modal="true"
        // eslint-disable-next-line jsx-a11y/aria-proptypes
        aria-hidden={!mobileOpen || undefined}
      >
        {/* Backdrop — tap anywhere outside the drawer to close.
            bg-black/50 works in both themes; fades via opacity transition. */}
        <button
          type="button"
          aria-label="Close menu"
          tabIndex={mobileOpen ? 0 : -1}
          onClick={() => setMobileOpen(false)}
          className={cn(
            "absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
        />

        {/* Drawer panel — slides in from the right via CSS transform. Kept in
            the DOM always so the slide-out animation has somewhere to play. */}
        <aside
          className={cn(
            "absolute inset-y-0 right-0 flex w-[85%] max-w-sm flex-col border-l border-border bg-card shadow-2xl transition-transform duration-300 ease-out",
            mobileOpen ? "translate-x-0" : "translate-x-full",
          )}
        >
            {/* Drawer header — logo + close */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center"
              >
                <Image
                  src="/Images/logo.png"
                  alt="MyScope"
                  width={120}
                  height={40}
                  className="h-9 w-auto"
                />
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search */}
            <div className="border-b border-border p-4">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    placeholder="Search events…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-muted/40 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:bg-background focus-visible:outline-none"
                  />
                </div>
              </form>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto px-2 py-3">
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Browse
              </p>
              <div className="space-y-0.5">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.category)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary/10 text-primary dark:text-white"
                          : "text-foreground hover:bg-muted",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>

              {user && (
                <>
                  <p className="mt-5 px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Account
                  </p>
                  <div className="space-y-0.5">
                    <DrawerLink href="/dashboard" icon={Calendar} onNavigate={() => setMobileOpen(false)}>
                      My Events
                    </DrawerLink>
                    {(user.role === "organizer" || user.role === "superadmin") && (
                      <DrawerLink href="/organizer" icon={Ticket} onNavigate={() => setMobileOpen(false)}>
                        Organizer
                      </DrawerLink>
                    )}
                    <DrawerLink href="/dashboard/profile" icon={User} onNavigate={() => setMobileOpen(false)}>
                      Profile
                    </DrawerLink>
                  </div>
                </>
              )}
            </nav>

            {/* Drawer footer — user identity + sign out, or sign-in CTA */}
            <div className="border-t border-border p-4">
              {user ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {user.profileImage ? (
                        <Image
                          src={user.profileImage}
                          alt={user.name ?? "User"}
                          width={36}
                          height={36}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{user.name?.charAt(0).toUpperCase() ?? "U"}</span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{user.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false)
                      handleLogout()
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/30 px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              ) : (
                <Link
                  href="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Sign in
                </Link>
              )}
            </div>
        </aside>
      </div>
    </>
  )
}

function DrawerLink({
  href,
  icon: Icon,
  onNavigate,
  children,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  onNavigate: () => void
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      {children}
    </Link>
  )
}

function UserMenuLink({
  href,
  icon: Icon,
  children,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      {children}
    </Link>
  )
}
