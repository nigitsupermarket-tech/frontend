// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that logged-in users should NOT be able to access
const GUEST_ONLY_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

/**
 * ✅ SESSION PERSISTENCE: Reads the `sbw-auth` cookie that authStore writes
 * via syncAuthCookie() on every auth state change and on Zustand rehydration.
 *
 * The cookie carries a minimal JSON snapshot:
 *   { isAuthenticated: true, user: { id, role } }
 *
 * This lets the middleware make auth decisions server-side without access to
 * the httpOnly JWT cookies or localStorage (neither is readable in middleware).
 */
function isAuthenticated(req: NextRequest): boolean {
  try {
    const authCookie = req.cookies.get("sbw-auth");

    if (!authCookie?.value) return false;

    const state = JSON.parse(decodeURIComponent(authCookie.value));
    return !!state?.isAuthenticated && !!state?.user;
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authenticated = isAuthenticated(req);

  // Redirect authenticated users away from guest-only pages
  if (GUEST_ONLY_ROUTES.some((r) => pathname.startsWith(r)) && authenticated) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|icons|fonts).*)",
  ],
};
