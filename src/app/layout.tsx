import type { Metadata } from "next";
import { Suspense } from "react";
import { IBM_Plex_Sans, Inter, Outfit } from "next/font/google";
import "../styles/globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ShopCartProvider } from "@/lib/shopCart";
import { ThemeProvider } from "@/components/theme/theme-provider";
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
    default: "MyScope — Discover events, book tickets",
    // Pages can override their own title; %s gets replaced. Tab still reads
    // "<Page> · MyScope" so the brand sticks on every tab.
    template: "%s · MyScope",
  },
  description: "Sri Lanka's home for live events, concerts, and experiences.",
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
    title: "MyScope — Discover events, book tickets",
    description: "Sri Lanka's home for live events, concerts, and experiences.",
    images: ["/opengraph-image.png"],
    locale: "en_LK",
  },
  twitter: {
    card: "summary_large_image",
    title: "MyScope — Discover events, book tickets",
    description: "Sri Lanka's home for live events, concerts, and experiences.",
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
            SearchAction (enables the Google sitelinks search box). Update
            `sameAs` with your real social profile URLs. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "MyScope",
              url: "https://www.myscope.lk",
              logo: "https://www.myscope.lk/Images/logo.png",
              description: "Sri Lanka's home for live events, concerts, theatre, and sports.",
              sameAs: [
                "https://www.facebook.com/profile.php?id=61583531460821",
                "https://www.instagram.com/myscope.lk/",
              ],
            }),
          }}
        />
        <script
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
                  the very top of the viewport on every page. Renders null
                  when the flag is off, so no layout cost otherwise. */}
              <MaintenanceBanner />
              {/* Moving announcement strip above the navbar. Scrolls away on
                  page scroll; the sticky navbar then pins to the top. */}
              <AnnouncementBar />
              {/* SiteHeader uses useSearchParams() — Next 16 requires a
                  Suspense boundary around any component that reads search
                  params, or static prerender of /404 fails. Fallback is
                  just an empty 16-tall band so layout doesn't jump. */}
              <Suspense fallback={<div className="h-16" aria-hidden />}>
                <SiteHeader />
              </Suspense>
              <main className="min-h-[calc(100vh-4rem)]">{children}</main>
              <SiteFooter />
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
