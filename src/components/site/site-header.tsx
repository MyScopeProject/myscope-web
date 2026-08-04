"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { DropdownMenu } from "radix-ui"

import {
  Calendar,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { cn } from "@/lib/utils"
// NAV_ITEMS lives in a plain module (no "use client") so the server-rendered
// homepage can import the real array. Importing it out of this client module
// would hand the server a client reference, not the array — that's what broke
// the homepage with `NAV_ITEMS.map is not a function`.
import { NAV_ITEMS } from "@/components/site/nav-items"

export function SiteHeader() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const searchRef = React.useRef<HTMLInputElement>(null)

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

  // Press "/" anywhere (outside a text field) to jump into search — a small
  // command-bar affordance that keeps the search a keystroke away without a
  // full modal palette.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return
      const el = document.activeElement
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable)
      if (typing) return
      e.preventDefault()
      searchRef.current?.focus()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

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
    router.push("/")
  }

  return (
    <>
    {/* Floating navbar: the outer <header> stays sticky and edge-to-edge so
        it has somewhere to pin; the inner pill is what actually renders —
        rounded, bordered, lifted on a soft shadow, sitting a few px in from
        every edge. Border/blur/shadow all ride theme tokens so the pill reads
        the same way the announcement bar + footer bracket the page: a clean
        self-contained block rather than a full-bleed bar. */}
    <header className="sticky top-0 z-40 w-full">
      <div className="mx-auto max-w-7xl px-3 pt-3 sm:px-4 sm:pt-4">
        <div className="flex h-16 items-center gap-1.5 rounded-2xl border border-border bg-background/80 px-2.5 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/65 sm:gap-2 sm:px-4">
        {/* Brand */}
        <Link href="/" className="flex shrink-0 items-center" aria-label="MyScope home">
          <Image
            src="/Images/navbar_logo.png"
            alt="MyScope"
            width={275}
            height={80}
            className="h-12 w-auto"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <nav className="ml-1 hidden items-center gap-0.5 md:flex">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = isActive(item.category)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  // One active/idle rule for both themes — dark `--primary` is
                  // a bright, legible violet and dark `--foreground` is already
                  // near-white, so the tokens carry the contrast without any
                  // per-theme white overrides.
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Search (desktop) — rounded pill matching the nav chips, with a "/"
            keyboard hint that fades out once the field is focused. */}
        <form onSubmit={handleSearch} className="ml-auto hidden max-w-sm flex-1 md:block">
          <div className="group relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              type="search"
              placeholder="Search events…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full rounded-full border border-transparent bg-muted/60 pl-10 pr-10 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 select-none rounded border border-border bg-background px-1.5 font-sans text-[11px] font-medium text-muted-foreground group-focus-within:opacity-0 lg:inline-block">
              /
            </kbd>
          </div>
        </form>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-0.5 sm:gap-1 md:ml-0">
          <ThemeToggle />

          {user ? (
            // Account dropdown is desktop-only — on mobile the drawer menu
            // handles dashboard / profile / sign out. Radix owns the a11y:
            // roving focus, escape, outside-click, aria wiring.
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className="group hidden items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm transition-colors hover:bg-muted data-[state=open]:bg-muted md:inline-flex"
                >
                  <Avatar user={user} className="h-7 w-7 text-xs" />
                  <span className="text-sm font-medium">{user.name?.split(" ")[0]}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={10}
                  className="z-50 w-60 origin-[var(--radix-dropdown-menu-content-transform-origin)] overflow-hidden rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-1"
                >
                  <div className="flex items-center gap-3 px-2 py-2">
                    <Avatar user={user} className="h-9 w-9 text-sm" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{user.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                  <MenuItem href="/dashboard" icon={Calendar}>My Events</MenuItem>
                  <MenuItem href="/shop/orders" icon={ShoppingBag}>My Orders</MenuItem>
                  <MenuItem href="/dashboard/profile" icon={User}>Profile</MenuItem>
                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                  <DropdownMenu.Item
                    onSelect={handleLogout}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-destructive outline-none transition-colors data-[highlighted]:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : (
            <div className="hidden items-center sm:flex">
              <Button asChild className="rounded-full">
                <Link href="/auth/login">Sign in</Link>
              </Button>
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
        {...(mobileOpen ? {} : { "aria-hidden": true })}
      >
        {/* Backdrop — tap anywhere outside the drawer to close. */}
        <button
          type="button"
          aria-label="Close menu"
          tabIndex={mobileOpen ? 0 : -1}
          onClick={() => setMobileOpen(false)}
          className={cn(
            "absolute inset-0 bg-foreground/40 backdrop-blur-sm transition-opacity duration-200",
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
                    className="h-10 w-full rounded-lg border border-input bg-muted/40 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
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
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
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
                    <DrawerLink href="/shop/orders" icon={ShoppingBag} onNavigate={() => setMobileOpen(false)}>
                      My Orders
                    </DrawerLink>
                    <DrawerLink href="/dashboard/profile" icon={User} onNavigate={() => setMobileOpen(false)}>
                      Profile
                    </DrawerLink>
                  </div>
                </>
              )}
            </nav>

            {/* Drawer footer — user identity + sign out, or auth CTAs */}
            <div className="border-t border-border p-4">
              {user ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
                    <Avatar user={user} className="h-9 w-9 text-sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{user.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    className="w-full rounded-lg"
                    onClick={() => {
                      setMobileOpen(false)
                      handleLogout()
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </Button>
                </div>
              ) : (
                <Button asChild className="w-full rounded-lg">
                  <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                    Sign in
                  </Link>
                </Button>
              )}
            </div>
        </aside>
      </div>
    </>
  )
}

// Shared avatar chip — profile image when present, otherwise the first
// initial on the brand-tint disc. Sized by the caller via `className`.
function Avatar({
  user,
  className,
}: {
  user: { name?: string | null; profileImage?: string | null }
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-semibold text-primary",
        className,
      )}
    >
      {user.profileImage ? (
        <Image
          src={user.profileImage}
          alt={user.name ?? "User"}
          width={40}
          height={40}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{user.name?.charAt(0).toUpperCase() ?? "U"}</span>
      )}
    </span>
  )
}

function MenuItem({
  href,
  icon: Icon,
  children,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <DropdownMenu.Item asChild>
      <Link
        href={href}
        className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground outline-none transition-colors data-[highlighted]:bg-muted"
      >
        <Icon className="h-4 w-4 text-muted-foreground" />
        {children}
      </Link>
    </DropdownMenu.Item>
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
