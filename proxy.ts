import { NextResponse, type NextRequest } from "next/server";

/**
 * The content dashboard has no login of its own.
 *
 * In development it stays open. In production it sits behind HTTP basic auth,
 * checked against the ADMIN_PASSWORD environment variable (any user name).
 * With no password configured the dashboard does not exist: both the page and
 * its API answer as not found, so a fresh deployment never ships an open CMS.
 */
export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") return NextResponse.next();

  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return NextResponse.rewrite(new URL("/admin-not-configured", request.url), {
      status: 404,
    });
  }

  if (suppliedPassword(request) === password) return NextResponse.next();

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Pulse 8 admin", charset="UTF-8"' },
  });
}

function suppliedPassword(request: NextRequest): string | null {
  const [scheme, encoded] = (request.headers.get("authorization") ?? "").split(" ");
  if (scheme !== "Basic" || !encoded) return null;
  try {
    const decoded = atob(encoded);
    return decoded.slice(decoded.indexOf(":") + 1);
  } catch {
    return null;
  }
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
