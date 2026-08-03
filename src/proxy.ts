import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Serves the existing /organizer/* pages at organizer.myscope.lk from this
// SAME deployment — no separate app, no route duplication.
//
//   organizer.myscope.lk/login   -> /organizer-login (outside the dashboard shell)
//   organizer.myscope.lk/        -> /organizer
//   organizer.myscope.lk/events  -> /organizer/events
//
// Paths that already start with /organizer (every internal <Link> in the
// dashboard already points at /organizer/...) pass through unchanged, so
// existing navigation needs zero changes to work on either host.
//
// myscope.lk (the main host) is untouched — this only ever rewrites requests
// whose Host header starts with "organizer.".
//
// Named proxy.ts / export function proxy() per Next.js 16's rename of the
// middleware file convention.
//
// Uses the raw `Host` request header, NOT request.nextUrl.hostname — the
// latter is derived from the server's own bind address in some setups (it
// resolved to "localhost" in local dev regardless of the incoming Host
// header), while the Host header itself is what both curl/dev testing and
// Vercel's edge network reliably pass through unchanged.
export function proxy(request: NextRequest) {
  const host = request.headers.get("host") || "";
  if (!host.startsWith("organizer.")) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    return NextResponse.rewrite(new URL("/organizer-login", request.url));
  }

  if (pathname.startsWith("/organizer")) {
    return NextResponse.next();
  }

  const rewritten = pathname === "/" ? "/organizer" : `/organizer${pathname}`;
  return NextResponse.rewrite(new URL(rewritten, request.url));
}

export const config = {
  // Skip Next internals, static assets, and API routes — only page requests
  // get the host check.
  matcher: ["/((?!_next/static|_next/image|api|favicon.ico|Images|images).*)"],
};
