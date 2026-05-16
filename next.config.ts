import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    turbopack: false,
  },
  images: {
    remotePatterns: [
      // Google profile pictures
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Supabase Storage (event banners + any future user avatars)
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
    ],
  },
};

export default nextConfig;
