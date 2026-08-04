import type { Metadata } from "next";
import { Suspense } from "react";
import Script from "next/script";
import { IBM_Plex_Sans, Inter, Outfit } from "next/font/google";
import "../styles/globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ShopCartProvider } from "@/lib/shopCart";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { SiteChrome } from "@/components/site/site-chrome";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { AnnouncementBar } from "@/components/site/announcement-bar";
import { MaintenanceBanner } from "@/components/site/maintenance-banner";
import { LightBeamsBackground } from "@/components/site/light-beams-background";
import { Toaster } from "react-hot-toast";

// Body / default sans — IBM Plex Sans (preserves the original brand voice).
const plexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Headings — Outfit.
const outfit = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// UI labels / chrome — Inter.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  // metadataBase makes relative OG / icon URLs resolve against the production
  // domain. Without it Next 16 falls back to localhost and Slack/iMessage etc.
  // can't fetch the preview image.
  metadataBase: new URL("https://www.myscope.lk"),
  title: {
    default: "MyScope.lk - Discover events, book tickets",
    // Pages can override their own title; %s gets replaced. Tab still reads
    // "<Page> · MyScope" so the brand sticks on every tab.
    template: "%s · MyScope",
  },
  description: "MyScope is Sri Lanka’s Smartest Ticket Booking Platform — concerts, theatre, sports, and everything in between.",
  applicationName: "MyScope",
  // Explicit icon list — belt-and-braces alongside the app-router file
  // conventions (icon.png, apple-icon.png) in case any client looks here.
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
    shortcut: "/icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "MyScope",
    title: "MyScope.lk - Discover events, book tickets",
    description: "MyScope is Sri Lanka’s Smartest Ticket Booking Platform — concerts, theatre, sports, and everything in between.",
    images: ["/opengraph-image.png"],
    locale: "en_LK",
  },
  twitter: {
    card: "summary_large_image",
    title: "MyScope.lk — Discover events, book tickets",
    description: "MyScope is Sri Lanka’s Smartest Ticket Booking Platform — concerts, theatre, sports, and everything in between.",
    images: ["/opengraph-image.png"],
  },
};

// Resolves the active theme before React mounts so the first paint matches the
// final color scheme — prevents a white flash on dark mode. First-time
// visitors (no stored preference) get dark mode by default; users who
// explicitly chose 'system' or 'light' keep that choice.
const themeInitScript = `
(function(){
  try {
    var stored = localStorage.getItem('myscope-web-theme');
    var theme = stored || 'dark';
    var resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    document.documentElement.classList.remove('light','dark');
    document.documentElement.classList.add(resolved);
    document.documentElement.style.colorScheme = resolved;
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${plexSans.variable} ${outfit.variable} ${inter.variable} antialiased min-h-screen bg-background text-foreground font-sans`}
      >
        {/* Structured data: Organization (brand panel) + WebSite with a
            SearchAction (enables the Google sitelinks search box). Rendered via
            next/script so React doesn't warn about a <script> in the component
            tree during client navigation — JSON-LD is data, not executable, and
            Google reads the injected tag fine. Update `sameAs` with your real
            social profile URLs. */}
        <Script
          id="jsonld-organization"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "MyScope",
              url: "https://www.myscope.lk",
              logo: "https://www.myscope.lk/Images/logo.png",
              description: "MyScope is Sri Lanka’s Smartest Ticket Booking Platform — concerts, theatre, sports, and everything in between.",
              sameAs: [
                "https://www.facebook.com/profile.php?id=61583531460821",
                "https://www.instagram.com/myscope.lk/",
              ],
            }),
          }}
        />
        <Script
          id="jsonld-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "MyScope",
              url: "https://www.myscope.lk",
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: "https://www.myscope.lk/events?search={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        <ThemeProvider defaultTheme="dark">
          <GoogleOAuthProvider clientId={googleClientId}>
            <AuthProvider>
              <ShopCartProvider>
              {/* Ambient light-beam background — fixed, behind every
                  visitor-facing page (home, events, shop, etc.). The
                  component itself opts out on organizer/admin/dashboard
                  paths so dense data screens stay clean. */}
              <LightBeamsBackground />
              {/* Maintenance banner above everything else — when admin flips
                  the maintenance toggle, every visitor sees the message at
                  the very top of the viewport on every page (organizer
                  dashboard included — a platform outage is relevant there
                  too). Renders null when the flag is off, so no layout cost
                  otherwise. */}
              <MaintenanceBanner />
              {/* Ticker, main nav, and footer are consumer-site chrome —
                  SiteChrome skips all three on organizer routes, which bring
                  their own chrome (OrganizerTopBar) instead. Rendered HERE
                  (in this Server Component) and passed down as already-
                  rendered nodes rather than imported inside the client
                  SiteChrome — importing them there would pull these Server
                  Components into client execution too, which is what caused
                  a real hydration mismatch in SiteFooter's copyright line. */}
              <SiteChrome
                ticker={<AnnouncementBar />}
                header={
                  // SiteHeader uses useSearchParams() — Next 16 requires a
                  // Suspense boundary around any component that reads search
                  // params, or static prerender of /404 fails. Fallback is
                  // just an empty 16-tall band so layout doesn't jump.
                  <Suspense fallback={<div className="h-16" aria-hidden />}>
                    <SiteHeader />
                  </Suspense>
                }
                footer={<SiteFooter />}
              >
                {children}
              </SiteChrome>
              {/* Professional in-app toaster — replaces native browser
                  alert()/confirm() dialogs (which prefix with
                  "www.myscope.lk says…"). Styled to match the project's
                  theme tokens so it reads cleanly in both light + dark. */}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: "var(--color-card, #ffffff)",
                    color: "var(--color-foreground, #111111)",
                    border: "1px solid var(--color-border, #e5e7eb)",
                    borderRadius: "0.75rem",
                    fontSize: "0.875rem",
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.3)",
                  },
                  success: { iconTheme: { primary: "#10b981", secondary: "#ffffff" } },
                  error:   { iconTheme: { primary: "#ef4444", secondary: "#ffffff" } },
                }}
              />
              </ShopCartProvider>
            </AuthProvider>
          </GoogleOAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
