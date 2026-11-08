import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";

describe("widget.js SDK and Shadow DOM Integration", () => {
  const widgetCode = fs.readFileSync(
    path.resolve(__dirname, "../../public/widget.js"),
    "utf-8"
  );

  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
    delete (window as any).FeedbackSDK;
  });

  afterEach(() => {
    if ((window as any).FeedbackSDK) {
      (window as any).FeedbackSDK.destroy();
    }
  });

  it("registers global FeedbackSDK object and mounts shadow DOM", () => {
    const script = document.createElement("script");
    script.setAttribute("data-workspace", "acme");
    script.setAttribute("data-form", "customer-feedback");
    document.body.appendChild(script);

    eval(widgetCode);

    expect((window as any).FeedbackSDK).toBeDefined();
    const sdk = (window as any).FeedbackSDK;

    expect(typeof sdk.init).toBe("function");
    expect(typeof sdk.open).toBe("function");
    expect(typeof sdk.close).toBe("function");
    expect(typeof sdk.identify).toBe("function");

    const host = document.getElementById("feedback-widget-root");
    expect(host).not.toBeNull();
    expect(host?.shadowRoot).not.toBeNull();

    const launcher = host?.shadowRoot?.querySelector(".fw-launcher");
    expect(launcher).not.toBeNull();
    expect(launcher?.textContent).toContain("Feedback");

    const iframe = host?.shadowRoot?.querySelector("iframe") as HTMLIFrameElement;
    expect(iframe).not.toBeNull();
    expect(iframe?.src).toContain("/embed/acme/customer-feedback");
  });

  it("opens and closes widget card via SDK methods", () => {
    eval(widgetCode);
    const sdk = (window as any).FeedbackSDK;
    sdk.init({ workspace: "acme", form: "customer-feedback" });

    const host = document.getElementById("feedback-widget-root");
    const card = host?.shadowRoot?.querySelector(".fw-card");

    expect(card?.classList.contains("fw-open")).toBe(false);

    sdk.open();
    expect(card?.classList.contains("fw-open")).toBe(true);

    sdk.close();
    expect(card?.classList.contains("fw-open")).toBe(false);
  });

  it("opens widget when clicking element with data-feedback-trigger", () => {
    const triggerBtn = document.createElement("button");
    triggerBtn.setAttribute("data-feedback-trigger", "true");
    triggerBtn.textContent = "Tell us what you think";
    document.body.appendChild(triggerBtn);

    eval(widgetCode);
    const sdk = (window as any).FeedbackSDK;
    sdk.init({ workspace: "acme", form: "customer-feedback" });

    const host = document.getElementById("feedback-widget-root");
    const card = host?.shadowRoot?.querySelector(".fw-card");

    expect(card?.classList.contains("fw-open")).toBe(false);

    triggerBtn.click();
    expect(card?.classList.contains("fw-open")).toBe(true);
  });

  it("mounts iframe with correct user identification query params", () => {
    eval(widgetCode);
    const sdk = (window as any).FeedbackSDK;
    sdk.init({
      workspace: "acme",
      form: "customer-feedback",
      userEmail: "vip@example.com",
      userName: "VIP Customer",
      userId: "usr_456",
      planTier: "enterprise",
    });

    const host = document.getElementById("feedback-widget-root");
    const iframe = host?.shadowRoot?.querySelector("iframe") as HTMLIFrameElement;
    expect(iframe).not.toBeNull();
    const url = new URL(iframe.src, "http://localhost");
    expect(url.pathname).toBe("/embed/acme/customer-feedback");
    expect(url.searchParams.get("email")).toBe("vip@example.com");
    expect(url.searchParams.get("name")).toBe("VIP Customer");
    expect(url.searchParams.get("user_id")).toBe("usr_456");
    expect(url.searchParams.get("plan_tier")).toBe("enterprise");
  });

  it("adjusts iframe height dynamically upon receiving feedback:resize postMessage", () => {
    eval(widgetCode);
    const sdk = (window as any).FeedbackSDK;
    sdk.init({ workspace: "acme", form: "customer-feedback" });

    const host = document.getElementById("feedback-widget-root");
    const iframe = host?.shadowRoot?.querySelector("iframe") as HTMLIFrameElement;
    expect(iframe).not.toBeNull();

    // Simulate postMessage from iframe
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "feedback:resize", height: 420 },
      })
    );

    expect(iframe.style.height).toBe("420px");
  });

  it("closes widget upon receiving feedback:close postMessage", () => {
    eval(widgetCode);
    const sdk = (window as any).FeedbackSDK;
    sdk.init({ workspace: "acme", form: "customer-feedback" });
    sdk.open();

    const host = document.getElementById("feedback-widget-root");
    const card = host?.shadowRoot?.querySelector(".fw-card");
    expect(card?.classList.contains("fw-open")).toBe(true);

    // Simulate close message from iframe
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "feedback:close" },
      })
    );

    expect(card?.classList.contains("fw-open")).toBe(false);
  });

  it("posts message to iframe contentWindow when identify() is called", () => {
    eval(widgetCode);
    const sdk = (window as any).FeedbackSDK;
    sdk.init({ workspace: "acme", form: "customer-feedback" });

    const host = document.getElementById("feedback-widget-root");
    const iframe = host?.shadowRoot?.querySelector("iframe") as HTMLIFrameElement;
    expect(iframe).not.toBeNull();

    const postMessageSpy = vi.fn();
    Object.defineProperty(iframe, "contentWindow", {
      value: { postMessage: postMessageSpy },
      configurable: true,
    });

    sdk.identify({ email: "new@example.com", name: "New User" });

    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        type: "feedback:identify",
        data: { email: "new@example.com", name: "New User" },
      },
      "*"
    );
  });

  it("supports inline container embed mode", () => {
    const inlineDiv = document.createElement("div");
    inlineDiv.id = "my-inline-feedback";
    document.body.appendChild(inlineDiv);

    eval(widgetCode);
    const sdk = (window as any).FeedbackSDK;
    sdk.init({
      workspace: "acme",
      form: "customer-feedback",
      container: "#my-inline-feedback",
    });

    const host = document.getElementById("feedback-widget-root");
    expect(inlineDiv.contains(host)).toBe(true);

    const launcher = host?.shadowRoot?.querySelector(".fw-launcher");
    expect(launcher).toBeNull();

    const card = host?.shadowRoot?.querySelector(".fw-card");
    expect(card?.classList.contains("fw-open")).toBe(true);
  });
});
