"use client"

import * as React from "react"
import Image from "next/image"
import { useTheme } from "@/components/theme/theme-provider"

// Same theme-aware logo swap as SiteHeader (see site-header.tsx) — separate
// art per theme, not just a recolor. Split out as its own tiny client
// component so SiteFooter itself stays a Server Component; pulling
// useTheme() directly into site-footer.tsx would force the whole footer
// into client execution.
export function FooterLogo({ className }: { className?: string }) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const logoSrc =
    mounted && resolvedTheme === "dark"
      ? "/Images/navbar_logo_dark.png"
      : "/Images/navbar_logo_light.png"

  return (
    <Image
      src={logoSrc}
      alt="MyScope"
      width={275}
      height={80}
      className={className}
    />
  )
}
