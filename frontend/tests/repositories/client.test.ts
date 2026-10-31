import { apiClient, ApiClientError } from "@/repositories/client";

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
});

