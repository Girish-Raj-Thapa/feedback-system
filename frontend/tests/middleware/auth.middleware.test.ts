/**
 * @vitest-environment node
 */
import { handleAuthRouting } from "@/middleware/auth.middleware";
import { NextRequest } from "next/server";

describe("handleAuthRouting middleware", () => {
  function createMockRequest(urlStr: string, cookies: Record<string, string> = {}) {
    const url = new URL(urlStr);
    const req = new NextRequest(url);
    for (const [key, val] of Object.entries(cookies)) {
      req.cookies.set(key, val);
    }
    return req;
  }

  it("allows public routes without authentication", () => {
    const req = createMockRequest("http://localhost:3000/login");
    const res = handleAuthRouting(req);
    expect(res).toBeNull();
  });

  it("allows public hosted feedback form routes (/f/...) without authentication", () => {
    const req = createMockRequest("http://localhost:3000/f/acme/survey");
    const res = handleAuthRouting(req);
    expect(res).toBeNull();
  });

  it("redirects unauthenticated user accessing protected route to login with redirect param", () => {
    const req = createMockRequest("http://localhost:3000/dashboard/workspaces");
    const res = handleAuthRouting(req);

    expect(res).not.toBeNull();
    expect(res?.status).toBe(307); // NextResponse.redirect
    expect(res?.headers.get("location")).toBe(
      "http://localhost:3000/login?redirect=%2Fdashboard%2Fworkspaces"
    );
  });

  it("preserves full search query parameters in redirect param when unauthenticated", () => {
    const req = createMockRequest(
      "http://localhost:3000/workspace/bazar?tab=inbox&id=8b465f3e-3edf-47b4-89f8-694a5b078370"
    );
    const res = handleAuthRouting(req);

    expect(res).not.toBeNull();
    expect(res?.status).toBe(307);
    expect(res?.headers.get("location")).toBe(
      "http://localhost:3000/login?redirect=%2Fworkspace%2Fbazar%3Ftab%3Dinbox%26id%3D8b465f3e-3edf-47b4-89f8-694a5b078370"
    );
  });

  it("redirects authenticated user away from login to root /", () => {
    const req = createMockRequest("http://localhost:3000/login", {
      ff_session: "valid-session-jwt",
    });
    const res = handleAuthRouting(req);

    expect(res).not.toBeNull();
    expect(res?.status).toBe(307);
    expect(res?.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("allows authenticated user to access protected routes", () => {
    const req = createMockRequest("http://localhost:3000/workspace/acme", {
      access_token: "valid-token",
    });
    const res = handleAuthRouting(req);
    expect(res).toBeNull();
  });

  it("allows user to access /login when cookie contains an expired JWT", () => {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const expiredPayload = Buffer.from(
      JSON.stringify({ sub: "user-123", type: "access", exp: Math.floor(Date.now() / 1000) - 3600 })
    ).toString("base64url");
    const expiredJwt = `${header}.${expiredPayload}.signature`;

    const req = createMockRequest("http://localhost:3000/login", {
      ff_session: expiredJwt,
    });
    const res = handleAuthRouting(req);

    // Should NOT redirect away to / (res should either be null or next with deleted cookie)
    expect(res?.status).not.toBe(307);
  });

  it("allows user to access /login when cookie contains a foreign localhost token (e.g. cronlink)", () => {
    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const foreignPayload = Buffer.from(
      JSON.stringify({ sub: "23", iss: "cronlink-auth", aud: "cronlink-services", type: "access" })
    ).toString("base64url");
    const foreignJwt = `${header}.${foreignPayload}.signature`;

    const req = createMockRequest("http://localhost:3000/login", {
      access_token: foreignJwt,
    });
    const res = handleAuthRouting(req);

    // Foreign token must not be recognized as an authenticated session for feedback-system
    expect(res?.status).not.toBe(307);
  });
});
