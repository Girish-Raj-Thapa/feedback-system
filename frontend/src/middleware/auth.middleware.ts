import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/verify-email",
  "/invite",
  "/forgot-password",
  "/reset-password",
];

export function handleAuthRouting(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;

  // Allow public hosted feedback forms (/f/[workspaceSlug]/[formSlug])
  if (pathname.startsWith("/f/")) {
    return null;
  }

  // Check for session cookie
  const hasSession =
    request.cookies.has("ff_session") || request.cookies.has("access_token");

  const isPublicAuthPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  // If unauthenticated and trying to access a protected route
  if (!hasSession && !isPublicAuthPath && pathname !== "/") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If already authenticated and trying to visit login/register, redirect to root
  if (hasSession && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return null;
}

