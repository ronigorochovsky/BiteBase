import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/pending", "/admin/login"];
const ALWAYS_ALLOW_PREFIXES = ["/api/auth/", "/api/admin/", "/_next/", "/favicon"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow internal Next.js paths, auth APIs, and admin APIs
  if (ALWAYS_ALLOW_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Always allow public pages
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Admin gate — any /admin/* route (login is already in PUBLIC_PATHS above)
  if (pathname.startsWith("/admin")) {
    const sessionCookie = request.cookies.get("bitebase_session");
    if (!sessionCookie?.value) {
      const url = new URL("/admin/login", request.url);
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // User gate — all other routes require a logged-in user (bbu indicator cookie)
  const bbu = request.cookies.get("bbu");
  if (!bbu?.value) {
    const url = new URL("/login", request.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)" ],
};
