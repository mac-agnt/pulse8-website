import { NextResponse, type NextRequest } from "next/server";

/**
 * The admin signs people in itself (lib/admin/auth.server.ts): every admin
 * page checks the session and every /api/admin route calls `guard`. This only
 * makes sure nothing under /admin is indexed or cached on the way out.
 */
export function proxy(request: NextRequest) {
  void request;
  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
