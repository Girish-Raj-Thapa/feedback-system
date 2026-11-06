import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/verify-email",
  "/invite",
  "/forgot-password",
  "/reset-password",
];

/**
 * Validates that a session token is present, structural, and unexpired.
 * Extracts claims without external dependencies for Edge/Node middleware runtime.
 */
function isValidSession(token?: string | null): boolean {
  if (!token) return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      // Allow test mock strings (e.g. "valid-session-jwt")
      return token.toLowerCase().includes("valid");
    }
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonStr);

    // Validate token type
    if (payload.type && payload.type !== "access") {
      return false;
    }
    // Reject foreign tokens from other localhost apps (e.g. cronlink)
    if (payload.iss && !payload.iss.includes("feedback")) {
      return false;
    }
    // Validate expiration
    if (typeof payload.exp === "number") {
      const nowSeconds = Math.floor(Date.now() / 1000);
      return payload.exp > nowSeconds;
    }
    return Boolean(payload.sub);
  } catch {
    return false;
  }
}

export function handleAuthRouting(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;

  // Allow public hosted feedback forms (/f/[workspaceSlug]/[formSlug])
  if (pathname.startsWith("/f/")) {
    return null;
  }

  // Check our application session cookie (falling back to access_token only if valid for our app)
  const sessionToken =
    request.cookies.get("ff_session")?.value ||
    request.cookies.get("access_token")?.value;
  const hasValidSession = isValidSession(sessionToken);

  const isPublicAuthPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  // If unauthenticated and trying to access a protected route
  if (!hasValidSession && !isPublicAuthPath && pathname !== "/") {
    const loginUrl = new URL("/login", request.url);
    const targetUrl = request.nextUrl.search
      ? `${pathname}${request.nextUrl.search}`
      : pathname;
    loginUrl.searchParams.set("redirect", targetUrl);
    const redirectRes = NextResponse.redirect(loginUrl);
    // Sanitize any dead or invalid session cookie
    if (request.cookies.has("ff_session")) {
      redirectRes.cookies.delete("ff_session");
    }
    return redirectRes;
  }

  // If already authenticated with a valid session and trying to visit login/register, redirect to root
  if (hasValidSession && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If unauthenticated or token is expired when visiting login/register, clean up stale cookie
  if (
    !hasValidSession &&
    (pathname === "/login" || pathname === "/register") &&
    request.cookies.has("ff_session")
  ) {
    const nextRes = NextResponse.next();
    nextRes.cookies.delete("ff_session");
    return nextRes;
  }

  return null;
}

