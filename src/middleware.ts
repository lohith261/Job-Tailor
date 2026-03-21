export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    // Protect all routes except public auth pages, NextAuth internals, and static assets.
    // Note: favicon\\.ico uses \\. to match a literal dot (not any character).
    "/((?!login|signup|api/auth|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
