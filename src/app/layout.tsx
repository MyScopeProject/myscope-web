import type { Metadata } from "next";
import { Suspense } from "react";
import { IBM_Plex_Sans, Inter, Outfit } from "next/font/google";
import "../styles/globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { AnnouncementBar } from "@/components/site/announcement-bar";

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
// final color scheme — prevents a white flash on dark mode.
const themeInitScript = `
(function(){
  try {
    var stored = localStorage.getItem('myscope-web-theme');
    var theme = stored || 'system';
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
        <ThemeProvider defaultTheme="system">
          <GoogleOAuthProvider clientId={googleClientId}>
            <AuthProvider>
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
            </AuthProvider>
          </GoogleOAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
