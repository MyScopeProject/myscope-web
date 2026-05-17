import { redirect } from "next/navigation"

// Registration was folded into /auth/login — the Google OAuth flow creates
// the account on first sign-in, so a dedicated sign-up page is just noise.
// This redirect keeps old links / bookmarks working.
export default function RegisterRedirectPage() {
  redirect("/auth/login")
}
