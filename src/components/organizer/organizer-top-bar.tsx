"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DropdownMenu } from "radix-ui"
import { ChevronDown, LogOut, UserCircle } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { ThemeToggle } from "@/components/ui/theme-toggle"

/**
 * Standalone top bar for the organizer dashboard — replaces the branding /
 * account-menu / theme-toggle that organizer pages used to inherit from the
 * consumer SiteHeader before SiteChrome stopped rendering it here. Sidebar
 * navigation (desktop rail + mobile drawer) stays in OrganizerShell; this bar
 * only owns identity (logo) and the account (avatar, sign out, theme).
 */
export function OrganizerTopBar() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    // On the organizer subdomain, "/login" resolves to the dedicated
    // organizer-login page via the proxy rewrite (see src/proxy.ts). On the
    // main host (myscope.lk/organizer — dual access is intentional, see
    // useOrganizerGuard), there is no top-level /login, so send those users
    // to the real one instead.
    const isOrganizerHost =
      typeof window !== "undefined" && window.location.hostname.startsWith("organizer.")
    router.push(isOrganizerHost ? "/login" : "/auth/login")
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/65">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/organizer" className="flex shrink-0 items-center gap-2" aria-label="Organizer dashboard home">
          <Image
            src="/Images/navbar_logo.png"
            alt="MyScope"
            width={165}
            height={48}
            className="h-8 w-auto"
            priority
          />
          <span className="hidden rounded-full border border-border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:inline">
            Organizer
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />

          {user && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className="group flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm transition-colors hover:bg-muted data-[state=open]:bg-muted"
                >
                  <Avatar user={user} className="h-7 w-7 text-xs" />
                  <span className="hidden text-sm font-medium sm:inline">{user.name?.split(" ")[0]}</span>
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
                  <DropdownMenu.Item asChild>
                    <Link
                      href="/organizer/profile"
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground outline-none transition-colors data-[highlighted]:bg-muted"
                    >
                      <UserCircle className="h-4 w-4 text-muted-foreground" />
                      Profile
                    </Link>
                  </DropdownMenu.Item>
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
          )}
        </div>
      </div>
    </header>
  )
}

// Mirrors site-header.tsx's Avatar chip so the two feel identical.
function Avatar({
  user,
  className,
}: {
  user: { name?: string | null; profileImage?: string | null }
  className?: string
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-semibold text-primary ${className ?? ""}`}
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
