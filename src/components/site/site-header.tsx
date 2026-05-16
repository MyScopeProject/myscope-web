"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import {
  Calendar,
  ChevronDown,
  Film,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  ScanLine,
  Search,
  Ticket,
  User,
  UserPlus,
  X,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/events", label: "Events", icon: Ticket },
  { href: "/movies", label: "Movies", icon: Film },
]

const SCANNER_ROLES = new Set(["scanner", "organizer", "superadmin", "moderator", "event-manager"])

export function SiteHeader() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
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

  const navItems = React.useMemo(() => {
    const items = [...NAV_ITEMS]
    if (user && SCANNER_ROLES.has(user.role)) {
      items.push({ href: "/scanner", label: "Scanner", icon: ScanLine })
    }
    return items
  }, [user])

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href)

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
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
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
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-sm transition-colors hover:bg-muted"
                aria-haspopup="true"
                aria-expanded={userMenuOpen ? "true" : "false"}
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
                <div className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md">
                  <div className="border-b border-border px-3 py-2">
                    <div className="truncate text-sm font-medium">{user.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                  </div>
                  <div className="py-1">
                    <UserMenuLink href="/dashboard" icon={LayoutDashboard}>Dashboard</UserMenuLink>
                    <UserMenuLink href="/dashboard/events" icon={Calendar}>My Events</UserMenuLink>
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
            <div className="hidden items-center gap-1 sm:flex">
              <Button asChild variant="ghost" size="sm">
                <Link href="/auth/login">
                  <LogIn /> Sign in
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/auth/register">
                  <UserPlus /> Sign up
                </Link>
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

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="mx-auto max-w-7xl space-y-3 px-4 py-3">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Search events…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-muted/40 pl-9 pr-3 text-sm placeholder:text-muted-foreground"
                />
              </div>
            </form>

            <nav className="flex flex-col">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
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

            {!user && (
              <div className="flex gap-2 pt-2">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link href="/auth/login">Sign in</Link>
                </Button>
                <Button asChild size="sm" className="flex-1">
                  <Link href="/auth/register">Sign up</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
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
