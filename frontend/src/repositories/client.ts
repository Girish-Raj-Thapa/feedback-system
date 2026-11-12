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

async function parseResponseData(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  return response.text();
}

function extractApiErrorMessage(data: unknown): string {
  if (data && typeof data === "object") {
    const errorObj = data as Record<string, unknown>;
    if (typeof errorObj.error === "string") {
      return errorObj.error;
    }
    if (typeof errorObj.detail === "string") {
      return errorObj.detail;
    }
    if (Array.isArray(errorObj.detail)) {
      return errorObj.detail
        .map((item) => {
          if (item && typeof item === "object") {
            const obj = item as Record<string, unknown>;
            return String(obj.msg || obj.message || JSON.stringify(obj));
          }
          return String(item);
        })
        .join(", ");
    }
    if (typeof errorObj.message === "string") {
      return errorObj.message;
    }
  } else if (typeof data === "string" && data.length > 0) {
    return data;
  }
  return "An unexpected error occurred";
}

async function requestRaw(
  endpoint: string,
  options: RequestOptions = {}
): Promise<Response> {
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

  if (!response.ok) {
    const data = await parseResponseData(response);
    throw new ApiClientError(extractApiErrorMessage(data), response.status, data);
  }

  return response;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const response = await requestRaw(endpoint, options);

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return (await parseResponseData(response)) as T;
}

export async function apiBlobClient(
  endpoint: string,
  options: RequestOptions = {}
): Promise<Blob> {
  const response = await requestRaw(endpoint, options);
  return response.blob();
}
