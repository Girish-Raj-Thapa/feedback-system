import { apiBlobClient, apiClient, ApiClientError } from "@/repositories/client";

describe("apiClient", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("should make successful GET request and return JSON", async () => {
    const mockData = { id: "123", name: "Acme Corp" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => mockData,
    });

    const result = await apiClient("/test-endpoint");
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/test-endpoint",
      expect.objectContaining({
        credentials: "include",
      })
    );
  });

  it("should return empty object on 204 No Content", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
    });

    const result = await apiClient("/delete-endpoint", { method: "DELETE" });
    expect(result).toEqual({});
  });

  it("should inject x-workspace-id header when workspaceId is provided", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ success: true }),
    });

    await apiClient("/workspace-endpoint", {
      workspaceId: "ws-12345",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );

    const callHeaders = (global.fetch as any).mock.calls[0][1].headers as Headers;
    expect(callHeaders.get("x-workspace-id")).toBe("ws-12345");
  });

  it("should set Content-Type to application/json when body is provided", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ id: "1" }),
    });

    await apiClient("/create-item", {
      method: "POST",
      body: { name: "Test" },
    });

    const callHeaders = (global.fetch as any).mock.calls[0][1].headers as Headers;
    expect(callHeaders.get("Content-Type")).toBe("application/json");
  });

  it("should throw ApiClientError with custom error field on 400", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ error: "Custom domain error message" }),
    });

    await expect(apiClient("/bad-request")).rejects.toThrow(ApiClientError);
    await expect(apiClient("/bad-request")).rejects.toThrow("Custom domain error message");
  });

  it("should throw ApiClientError parsing FastAPI detail array on 422", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        detail: [{ loc: ["body", "email"], msg: "Invalid email address" }],
      }),
    });

    await expect(apiClient("/validation-error")).rejects.toThrow("Invalid email address");
  });

  it("should return a Blob from apiBlobClient when request succeeds", async () => {
    const csvBlob = new Blob(["id,comment\n1,Great"], { type: "text/csv" });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "text/csv" }),
      blob: async () => csvBlob,
    });

    const result = await apiBlobClient("/workspaces/ws-1/feedback/submissions/export", {
      workspaceId: "ws-1",
    });

    expect(result).toBe(csvBlob);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/workspaces/ws-1/feedback/submissions/export"),
      expect.objectContaining({
        credentials: "include",
      })
    );
    const [, requestInit] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((requestInit.headers as Headers).get("X-Workspace-Id")).toBe("ws-1");
  });

  it("should throw ApiClientError from apiBlobClient on error response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ detail: "Forbidden workspace export" }),
    });

    await expect(
      apiBlobClient("/workspaces/ws-1/feedback/submissions/export")
    ).rejects.toThrow("Forbidden workspace export");
  });
});

