export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/((?!login|signup|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
