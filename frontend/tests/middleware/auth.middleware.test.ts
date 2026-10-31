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
});
