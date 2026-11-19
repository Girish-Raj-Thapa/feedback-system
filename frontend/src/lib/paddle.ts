/**
 * Lightweight typed loader for Paddle Billing v2 overlay checkout (`paddle.js`).
 */

export interface PaddleCheckoutOptions {
  items: Array<{ priceId: string; quantity: number }>;
  customData?: Record<string, string>;
  customer?: { email?: string };
}

interface PaddleGlobal {
  Environment?: {
    set: (env: "sandbox" | "production") => void;
  };
  Initialize: (config: {
    token: string;
    eventCallback?: (event: { name?: string }) => void;
  }) => void;
  Checkout: {
    open: (options: PaddleCheckoutOptions) => void;
  };
}

declare global {
  interface Window {
    Paddle?: PaddleGlobal;
  }
}

const PADDLE_SCRIPT_URL = "https://cdn.paddle.com/paddle/v2/paddle.js";
let scriptPromise: Promise<PaddleGlobal> | null = null;
let initializedToken: string | null = null;

function ensurePaddleScript(): Promise<PaddleGlobal> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Paddle checkout requires a browser environment."));
  }
  if (window.Paddle) {
    return Promise.resolve(window.Paddle);
  }
  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise<PaddleGlobal>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${PADDLE_SCRIPT_URL}"]`
    );
    const script = existing || document.createElement("script");

    const onLoad = () => {
      if (window.Paddle) {
        resolve(window.Paddle);
      } else {
        scriptPromise = null;
        reject(new Error("Paddle.js loaded without initializing window.Paddle."));
      }
    };
    const onError = () => {
      scriptPromise = null;
      reject(new Error("Failed to load Paddle Checkout script."));
    };

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });

    if (!existing) {
      script.src = PADDLE_SCRIPT_URL;
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return scriptPromise;
}

export async function openPaddleOverlayCheckout(params: {
  environment: "sandbox" | "production";
  clientToken: string;
  priceId: string;
  workspaceId: string;
  userId?: string;
  email?: string;
  onCompleted?: () => void;
}): Promise<void> {
  const paddle = await ensurePaddleScript();

  if (initializedToken !== params.clientToken) {
    if (params.environment === "sandbox" && paddle.Environment?.set) {
      paddle.Environment.set("sandbox");
    }
    paddle.Initialize({
      token: params.clientToken,
      eventCallback: (event) => {
        if (event?.name === "checkout.completed") {
          params.onCompleted?.();
        }
      },
    });
    initializedToken = params.clientToken;
  }

  const customData: Record<string, string> = {
    workspace_id: params.workspaceId,
  };
  if (params.userId) {
    customData.user_id = params.userId;
  }

  paddle.Checkout.open({
    items: [{ priceId: params.priceId, quantity: 1 }],
    customData,
    customer: params.email ? { email: params.email } : undefined,
  });
}
