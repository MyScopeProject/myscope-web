import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../styles/globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { MusicPlayerProvider } from "@/context/MusicPlayerContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Navbar from "@/components/navbar/Navbar";
import Footer from "@/components/footer/Footer";
import MiniPlayer from "@/components/MiniPlayer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MyScope - Your Entertainment Hub",
  description: "Discover events, watch movies, and enjoy premium entertainment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleOAuthProvider clientId={googleClientId}>
          <AuthProvider>
            <FavoritesProvider>
              <MusicPlayerProvider>
                <Navbar />
                {children}
                <Footer />
                <MiniPlayer />
              </MusicPlayerProvider>
            </FavoritesProvider>
          </AuthProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
