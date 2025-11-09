import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../styles/globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { MusicPlayerProvider } from "@/context/MusicPlayerContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
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
  description: "Stream music, discover events, watch shows, and connect with your community",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
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
      </body>
    </html>
  );
}
