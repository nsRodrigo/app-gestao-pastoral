import { NextRequest, NextResponse } from "next/server";
import { COOKIE } from "@/lib/config";

export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has(COOKIE.access);

  if (request.nextUrl.pathname.startsWith("/dashboard") && !hasSession) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }

  if (request.nextUrl.pathname === "/login" && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
