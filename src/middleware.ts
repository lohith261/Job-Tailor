import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/landing",
  "/login",
  "/signup",
  "/verify-email",
  "/pricing",
  "/forgot-password",
  "/reset-password",
];

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Authenticated user hitting landing → send to app
    if (pathname === "/landing" && token) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Unauthenticated user hitting a protected route → /landing (no callbackUrl)
    if (!token) {
      const isPublic =
        PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/cron") ||
        pathname.startsWith("/_next/static") ||
        pathname.startsWith("/_next/image") ||
        pathname === "/favicon.ico";

      if (!isPublic) {
        return NextResponse.redirect(new URL("/landing", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Always return true — let the middleware function above handle all redirects
      authorized() {
        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
