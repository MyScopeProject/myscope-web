import type { Metadata } from "next";
import { IBM_Plex_Sans, Inter, Outfit } from "next/font/google";
import "../styles/globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

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
  title: "MyScope — Discover events, book tickets",
  description: "Sri Lanka's home for live events, movies, and experiences.",
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
        <ThemeProvider defaultTheme="system">
          <GoogleOAuthProvider clientId={googleClientId}>
            <AuthProvider>
              <SiteHeader />
              <main className="min-h-[calc(100vh-4rem)]">{children}</main>
              <SiteFooter />
            </AuthProvider>
          </GoogleOAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
