"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { DropdownMenu } from "radix-ui"

import {
  Calendar,
  ChevronDown,
  LogOut,
  Menu,
  ShoppingBag,
  User,
  X,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useTheme } from "@/components/theme/theme-provider"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { NavSearch } from "@/components/site/nav-search"
import { cn } from "@/lib/utils"

export function SiteHeader() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  // Separate logo art per theme (drawn for each background specifically,
  // not just a recolor) — default to the light logo before mount so SSR and
  // the first client render match; ThemeToggle uses the same guard pattern.
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const logoSrc =
    mounted && resolvedTheme === "dark"
      ? "/Images/navbar_logo_dark.png"
      : "/Images/navbar_logo_light.png"

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

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  return (
    <>
    {/* Stitched navbar: full-bleed background flush against the announcement
        bar directly above it (stickiness is applied to both together by the
        SiteChrome wrapper) — square top corners so the seam is invisible,
        rounded-b-2xl on the bottom only so it still reads as a distinct,
        lifted panel over the page content beneath it.
        Light mode: unchanged neutral bg-card, same as before. Dark mode:
        solid --primary violet (same as the Button component) — bg-card in
        dark mode was the same near-black as the page's ambient background,
        so the bar was invisible there; violet fixes that. Content below
        picks up matching dark:-only primary-foreground contrast tones. */}
    <header className="w-full border-b border-border bg-card/80 dark:border-primary-foreground/10 dark:bg-[#401268] rounded-b-2xl shadow-lg backdrop-blur supports-backdrop-filter:bg-card/65 dark:supports-backdrop-filter:bg-[#401268]">
      <div className="mx-auto max-w-7xl px-3 sm:px-4">
        <div className="flex h-16 items-center gap-1.5 sm:gap-2">
        {/* Brand */}
        <Link href="/" className="flex shrink-0 items-center" aria-label="MyScope home">
          <Image
            src={logoSrc}
            alt="MyScope"
            width={275}
            height={80}
            className="h-14 w-auto"
            priority
          />
        </Link>

        {/* Search (desktop) — centered in the bar now that the category nav
            links are gone. Search input + independent date/price pickers
            sit side by side (see NavSearch) so widening beyond the old
            max-w-md gives the extra controls room to breathe. onPrimary
            adds dark-mode-only contrast tones for the violet header. */}
        <div className="mx-auto hidden max-w-xl flex-1 md:block">
          <NavSearch onPrimary />
        </div>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-0.5 sm:gap-1 md:ml-0">
          <ThemeToggle className="dark:hover:bg-primary-foreground/10 dark:hover:text-primary-foreground dark:focus-visible:ring-primary-foreground/50" />

          {user ? (
            // Account dropdown is desktop-only — on mobile the drawer menu
            // handles dashboard / profile / sign out. Radix owns the a11y:
            // roving focus, escape, outside-click, aria wiring.
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className="group hidden items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm transition-colors hover:bg-muted data-[state=open]:bg-muted dark:hover:bg-primary-foreground/10 dark:data-[state=open]:bg-primary-foreground/10 md:inline-flex"
                >
                  <Avatar user={user} className="h-7 w-7 text-xs dark:bg-primary-foreground/20 dark:text-primary-foreground" />
                  <span className="text-sm font-medium">{user.name?.split(" ")[0]}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 dark:text-primary-foreground/70" />
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
              <Button
                asChild
                className="rounded-full dark:bg-primary-foreground dark:text-[#401268] dark:hover:bg-primary-foreground/90"
              >
                <Link href="/auth/login">Sign in</Link>
              </Button>
            </div>
          )}

          {/* Mobile menu trigger */}
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-muted dark:border-primary-foreground/25 dark:bg-primary-foreground/10 dark:text-primary-foreground dark:hover:bg-primary-foreground/20 md:hidden"
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
              <NavSearch />
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto px-2 py-3">
              {user && (
                <>
                  <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
