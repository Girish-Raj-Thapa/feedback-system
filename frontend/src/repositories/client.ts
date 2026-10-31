export class ApiClientError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  workspaceId?: string;
  body?: unknown;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { workspaceId, body, headers: customHeaders, ...rest } = options;

  const headers = new Headers(customHeaders);

  if (body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (workspaceId) {
    headers.set("x-workspace-id", workspaceId);
  }

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const response = await fetch(url, {
    ...rest,
    headers,
    credentials: "include", // Sends ff_session / access_token HTTP-only cookies
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  let data: unknown;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let errorMessage = "An unexpected error occurred";
    if (data && typeof data === "object") {
      const errorObj = data as Record<string, unknown>;
      if (typeof errorObj.error === "string") {
        errorMessage = errorObj.error;
      } else if (typeof errorObj.detail === "string") {
        errorMessage = errorObj.detail;
      } else if (Array.isArray(errorObj.detail)) {
        errorMessage = errorObj.detail
          .map((item) => {
            if (item && typeof item === "object") {
              const obj = item as Record<string, unknown>;
              return String(obj.msg || obj.message || JSON.stringify(obj));
            }
            return String(item);
          })
          .join(", ");
      } else if (typeof errorObj.message === "string") {
        errorMessage = errorObj.message;
      }
    } else if (typeof data === "string" && data.length > 0) {
      errorMessage = data;
    }

    throw new ApiClientError(errorMessage, response.status, data);
  }

  return data as T;
}
