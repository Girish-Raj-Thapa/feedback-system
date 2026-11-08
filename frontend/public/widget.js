/**
 * Feedback Management System - Universal Embeddable Widget SDK
 * Lightweight, zero-dependency, shadow-DOM encapsulated iframe loader.
 *
 * Runs all form UI from your own origin:
 * - Single Turnstile verification domain
 * - Strict CSP frame-ancestors enforcement
 * - Dynamic height auto-sizing via postMessage
 * - Floating Launcher / Custom Trigger / Inline Container modes
 * - Silent Context & Identity Pass-Through
 */
(function (window, document) {
  "use strict";

  if (window.FeedbackSDK && window.FeedbackSDK._initialized) {
    return;
  }

  // --- Utility Helpers ---
  function getScriptOrigin() {
    var script =
      document.currentScript ||
      document.querySelector('script[src*="widget.js"]') ||
      document.querySelector("script[data-workspace]");
    if (script && script.src) {
      try {
        var url = new URL(script.src);
        return url.origin;
      } catch (e) {
        // Fallback to window.location.origin
      }
    }
    return window.location.origin;
  }

  function getScriptAttributes() {
    var script =
      document.currentScript ||
      document.querySelector('script[src*="widget.js"]') ||
      document.querySelector("script[data-workspace]");
    if (!script) return {};

    var attrs = {
      workspace: script.getAttribute("data-workspace") || "",
      form: script.getAttribute("data-form") || "",
      apiUrl: script.getAttribute("data-api-url") || "",
      position: script.getAttribute("data-position") || "bottom_right",
      buttonText: script.getAttribute("data-button-text") || "Feedback",
      container: script.getAttribute("data-container") || "",
      theme: script.getAttribute("data-theme") || "",
      userId: script.getAttribute("data-user-id") || "",
      userEmail: script.getAttribute("data-user-email") || "",
      userName: script.getAttribute("data-user-name") || "",
      planTier: script.getAttribute("data-plan-tier") || "",
      monthlySpend: script.getAttribute("data-monthly-spend") || "",
      delaySeconds: Number(
        script.getAttribute("data-delay") ||
          script.getAttribute("data-delay-seconds") ||
          0
      ),
      metadata: {},
    };

    var rawMeta = script.getAttribute("data-metadata");
    if (rawMeta) {
      try {
        attrs.metadata = JSON.parse(rawMeta);
      } catch (e) {
        console.warn("[FeedbackSDK] Failed to parse data-metadata JSON:", e);
      }
    }

    return attrs;
  }

  var CHAT_ICON =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';

  // --- Widget Controller Class ---
  function FeedbackWidget() {
    this._initialized = true;
    this.config = {};
    this.isOpen = false;
    this.isSubmitted = false;
    this.isInline = false;
    this.hostEl = null;
    this.shadowRoot = null;
    this.card = null;
    this.backdrop = null;
    this.launcher = null;
    this.iframe = null;
    this.userMetadata = {};

    this._boundTriggerHandler = this._handleTriggerClick.bind(this);
    this._boundEscHandler = this._handleKeyDown.bind(this);
    this._boundMessageHandler = this._handleMessage.bind(this);
  }

  FeedbackWidget.prototype.init = function (options) {
    options = options || {};
    var scriptAttrs = getScriptAttributes();
    var scriptOrigin = getScriptOrigin();

    this.config = {
      origin: options.origin || scriptOrigin,
      workspace: options.workspace || scriptAttrs.workspace,
      form: options.form || scriptAttrs.form,
      apiUrl: options.apiUrl || scriptAttrs.apiUrl,
      position: options.position || scriptAttrs.position || "bottom_right",
      buttonText: options.buttonText || scriptAttrs.buttonText || "Feedback",
      container: options.container || scriptAttrs.container || "",
      theme: options.theme || scriptAttrs.theme || "",
      userEmail: options.userEmail || scriptAttrs.userEmail || "",
      userName: options.userName || scriptAttrs.userName || "",
      userId: options.userId || scriptAttrs.userId || "",
      planTier: options.planTier || scriptAttrs.planTier || "",
      monthlySpend: options.monthlySpend || scriptAttrs.monthlySpend || "",
      delaySeconds:
        options.delaySeconds !== undefined
          ? Number(options.delaySeconds)
          : scriptAttrs.delaySeconds || 0,
      metadata: Object.assign({}, scriptAttrs.metadata, options.metadata || {}),
    };

    this.userMetadata = Object.assign(
      {
        user_id: this.config.userId || undefined,
        plan_tier: this.config.planTier || undefined,
        monthly_spend: this.config.monthlySpend
          ? Number(this.config.monthlySpend)
          : undefined,
      },
      this.config.metadata
    );

    if (!this.config.workspace || !this.config.form) {
      console.warn(
        "[FeedbackSDK] Missing required workspace or form configuration."
      );
      return;
    }

    this._setupGlobalListeners();
    this._mount();
  };

  FeedbackWidget.prototype._setupGlobalListeners = function () {
    document.addEventListener("click", this._boundTriggerHandler, true);
    document.addEventListener("keydown", this._boundEscHandler, true);
    window.addEventListener("message", this._boundMessageHandler, false);
  };

  FeedbackWidget.prototype._handleTriggerClick = function (e) {
    var target = e.target;
    var trigger = target.closest
      ? target.closest("[data-feedback-trigger], [data-feedback-open]")
      : null;
    if (trigger) {
      e.preventDefault();
      this.open();
    }
  };

  FeedbackWidget.prototype._handleKeyDown = function (e) {
    if (e.key === "Escape" && this.isOpen && !this.isInline) {
      this.close();
    }
  };

  FeedbackWidget.prototype._handleMessage = function (e) {
    if (!e.data || typeof e.data !== "object") return;

    if (e.data.type === "feedback:resize" && typeof e.data.height === "number") {
      if (this.iframe) {
        var newHeight = Math.max(160, Math.ceil(e.data.height));
        this.iframe.style.height = newHeight + "px";
      }
    } else if (e.data.type === "feedback:close") {
      this.close();
    } else if (e.data.type === "feedback:submitted") {
      this.isSubmitted = true;
    }
  };

  FeedbackWidget.prototype._buildEmbedUrl = function () {
    var origin = this.config.origin || getScriptOrigin();
    var path =
      "/embed/" +
      encodeURIComponent(this.config.workspace) +
      "/" +
      encodeURIComponent(this.config.form);
    var url = new URL(path, origin);

    if (this.config.userEmail) {
      url.searchParams.set("email", this.config.userEmail);
    }
    if (this.config.userName) {
      url.searchParams.set("name", this.config.userName);
    }
    if (this.config.userId) {
      url.searchParams.set("user_id", this.config.userId);
    }
    if (this.config.planTier) {
      url.searchParams.set("plan_tier", this.config.planTier);
    }
    if (this.config.monthlySpend) {
      url.searchParams.set("monthly_spend", String(this.config.monthlySpend));
    }

    if (this.userMetadata) {
      for (var key in this.userMetadata) {
        if (
          Object.prototype.hasOwnProperty.call(this.userMetadata, key) &&
          this.userMetadata[key] !== undefined &&
          !url.searchParams.has(key)
        ) {
          url.searchParams.set(key, String(this.userMetadata[key]));
        }
      }
    }

    return url.toString();
  };

  FeedbackWidget.prototype._mount = function () {
    if (this.hostEl && this.hostEl.parentNode) {
      this.hostEl.parentNode.removeChild(this.hostEl);
    }

    var inlineSelector = this.config.container || "[data-feedback-inline]";
    var inlineContainer = document.querySelector(inlineSelector);

    this.hostEl = document.createElement("div");
    this.hostEl.id = "feedback-widget-root";

    if (inlineContainer) {
      inlineContainer.appendChild(this.hostEl);
      this.isInline = true;
      this.isOpen = true;
    } else {
      document.body.appendChild(this.hostEl);
      this.isInline = false;
    }

    this.shadowRoot = this.hostEl.attachShadow({ mode: "open" });
    this._injectStyles();

    var wrapper = document.createElement("div");
    wrapper.className = "fw-wrapper" + (this.isInline ? " fw-inline-mode" : "");
    this.shadowRoot.appendChild(wrapper);

    // 1. Floating Launcher Button (if not inline and not custom_trigger)
    var isLeft = this.config.position === "bottom_left";
    if (!this.isInline && this.config.position !== "custom_trigger") {
      this.launcher = document.createElement("button");
      this.launcher.className = "fw-launcher";
      this.launcher.setAttribute("aria-label", this.config.buttonText);
      this.launcher.innerHTML =
        CHAT_ICON + "<span>" + escapeHtml(this.config.buttonText) + "</span>";
      this.launcher.onclick = this.toggle.bind(this);
      wrapper.appendChild(this.launcher);

      if (this.config.delaySeconds > 0) {
        var l = this.launcher;
        l.style.opacity = "0";
        l.style.pointerEvents = "none";
        setTimeout(function () {
          l.style.transition = "opacity 0.3s ease, transform 0.2s ease";
          l.style.opacity = "1";
          l.style.pointerEvents = "auto";
        }, this.config.delaySeconds * 1000);
      }
    }

    // 2. Backdrop Overlay
    this.backdrop = document.createElement("div");
    this.backdrop.className = "fw-backdrop" + (this.isOpen ? " fw-open" : "");
    this.backdrop.onclick = this.close.bind(this);
    wrapper.appendChild(this.backdrop);

    // 3. Card Popover containing the Iframe
    this.card = document.createElement("div");
    this.card.className = "fw-card" + (this.isOpen ? " fw-open" : "");
    wrapper.appendChild(this.card);

    // 4. Iframe
    this.iframe = document.createElement("iframe");
    this.iframe.className = "fw-iframe";
    this.iframe.src = this._buildEmbedUrl();
    this.iframe.title = "Feedback Form";
    this.iframe.setAttribute("allow", "clipboard-write");
    this.card.appendChild(this.iframe);
  };

  FeedbackWidget.prototype._injectStyles = function () {
    var isLeft = this.config.position === "bottom_left";

    var css = `
      :host {
        --fw-primary: #4249C9;
        --fw-primary-hover: #353aa5;
        --fw-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-family: var(--fw-font);
        box-sizing: border-box;
      }

      *, *::before, *::after {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      /* Floating Launcher */
      .fw-launcher {
        position: fixed;
        bottom: 24px;
        ${isLeft ? "left: 24px;" : "right: 24px;"}
        z-index: 2147483640;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background-color: var(--fw-primary);
        color: #ffffff;
        border: none;
        outline: none;
        border-radius: 9999px;
        padding: 12px 18px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.16);
        transition: transform 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
      }
      .fw-launcher:hover {
        background-color: var(--fw-primary-hover);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.22);
      }
      .fw-launcher:active {
        transform: translateY(0);
      }

      /* Backdrop Overlay */
      .fw-backdrop {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        z-index: 2147483645;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      .fw-backdrop.fw-open {
        display: block;
        opacity: 1;
      }

      /* Modal Popover Card */
      .fw-card {
        position: fixed;
        bottom: 84px;
        ${isLeft ? "left: 24px;" : "right: 24px;"}
        width: 400px;
        max-width: calc(100vw - 32px);
        background-color: transparent;
        border-radius: 12px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        z-index: 2147483646;
        opacity: 0;
        transform: translateY(12px) scale(0.98);
        pointer-events: none;
        transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        overflow: hidden;
      }

      .fw-card.fw-open {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }

      /* Responsive Iframe */
      .fw-iframe {
        width: 100%;
        min-height: 200px;
        border: none;
        display: block;
        border-radius: 12px;
        overflow: hidden;
        transition: height 0.15s ease;
      }

      /* Inline Mode */
      .fw-wrapper.fw-inline-mode .fw-card {
        position: static;
        width: 100%;
        max-width: 100%;
        box-shadow: none;
        opacity: 1;
        transform: none;
        pointer-events: auto;
      }
      .fw-wrapper.fw-inline-mode .fw-launcher,
      .fw-wrapper.fw-inline-mode .fw-backdrop {
        display: none !important;
      }

      /* Mobile Drawer (< 640px) */
      @media (max-width: 640px) {
        .fw-card:not(.fw-inline-mode) {
          position: fixed;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          max-height: 85vh;
          border-radius: 16px 16px 0 0;
          transform: translateY(100%);
        }
        .fw-card.fw-open:not(.fw-inline-mode) {
          transform: translateY(0);
        }
      }
    `;

    var styleEl = document.createElement("style");
    styleEl.textContent = css;
    this.shadowRoot.appendChild(styleEl);
  };

  FeedbackWidget.prototype.open = function (extraMetadata) {
    if (extraMetadata) {
      this.identify(extraMetadata);
    }
    this.isOpen = true;
    if (this.card) this.card.classList.add("fw-open");
    if (this.backdrop) this.backdrop.classList.add("fw-open");
  };

  FeedbackWidget.prototype.close = function () {
    if (this.isInline) return;
    this.isOpen = false;
    if (this.card) this.card.classList.remove("fw-open");
    if (this.backdrop) this.backdrop.classList.remove("fw-open");
  };

  FeedbackWidget.prototype.toggle = function () {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  };

  FeedbackWidget.prototype.identify = function (userData) {
    if (!userData || typeof userData !== "object") return;

    if (userData.email) this.config.userEmail = userData.email;
    if (userData.name) this.config.userName = userData.name;
    this.userMetadata = Object.assign({}, this.userMetadata, userData);

    if (this.iframe && this.iframe.contentWindow) {
      this.iframe.contentWindow.postMessage(
        { type: "feedback:identify", data: userData },
        "*"
      );
    }
  };

  FeedbackWidget.prototype.destroy = function () {
    document.removeEventListener("click", this._boundTriggerHandler, true);
    document.removeEventListener("keydown", this._boundEscHandler, true);
    window.removeEventListener("message", this._boundMessageHandler, false);
    if (this.hostEl && this.hostEl.parentNode) {
      this.hostEl.parentNode.removeChild(this.hostEl);
    }
    this.hostEl = null;
    this.shadowRoot = null;
    this.card = null;
    this.backdrop = null;
    this.launcher = null;
    this.iframe = null;
  };

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // --- Instantiate & Export Global SDK ---
  var instance = new FeedbackWidget();
  window.FeedbackSDK = instance;

  function autoInit() {
    var attrs = getScriptAttributes();
    if (attrs.workspace && attrs.form) {
      instance.init();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }
})(window, document);
