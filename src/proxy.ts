import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/config";

// Lightweight route protection (no database access). Pages and server actions still
// perform their own authorization; this only redirects unauthenticated visitors early.
const { auth } = NextAuth(authConfig);

const PROTECTED_PREFIXES = ["/dashboard", "/messages", "/favorites", "/settings", "/properties/new", "/onboarding"];
const ADMIN_PREFIX = "/admin";
const AUTH_PAGES = ["/login", "/signup", "/forgot-password", "/reset-password"];

export default auth((request) => {
  const { nextUrl } = request;
  const pathname = nextUrl.pathname;
  const user = request.auth?.user;

  const isEditRoute = /^\/properties\/[^/]+\/edit$/.test(pathname);
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) || isEditRoute;
  const isAdmin = pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`);

  if ((isProtected || isAdmin) && !user) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdmin && user && user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", nextUrl));
  }

  if (user && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js|map)$).*)"],
};
