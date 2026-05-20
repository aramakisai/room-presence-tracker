import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session;
  const isKiosk = session?.user?.isKiosk ?? false;

  // Allow: public API routes (Discord Interactions, reset)
  if (
    nextUrl.pathname.startsWith("/api/discord") ||
    nextUrl.pathname.startsWith("/api/presence/reset") ||
    nextUrl.pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  // Allow: login page
  if (nextUrl.pathname === "/login") {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/presence", nextUrl));
    }
    return NextResponse.next();
  }

  // Require login for everything else
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // Kiosk route: only kiosk accounts
  if (nextUrl.pathname.startsWith("/kiosk")) {
    if (!isKiosk) {
      return NextResponse.redirect(new URL("/presence", nextUrl));
    }
    return NextResponse.next();
  }

  // Kiosk accounts: redirect to /kiosk
  if (isKiosk && !nextUrl.pathname.startsWith("/kiosk")) {
    return NextResponse.redirect(new URL("/kiosk", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
