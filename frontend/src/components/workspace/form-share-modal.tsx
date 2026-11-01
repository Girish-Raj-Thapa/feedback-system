"use client";

import { useState } from "react";
import { Check, Code, Copy, ExternalLink, Globe, QrCode, X } from "lucide-react";
import { toast } from "sonner";

interface FormShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceSlug: string;
  formSlug: string;
  formName: string;
}

export function FormShareModal({
  isOpen,
  onClose,
  workspaceSlug,
  formSlug,
  formName,
}: FormShareModalProps) {
  const [activeTab, setActiveTab] = useState<"embed" | "link" | "qr">("link");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://feedback-system.com";
  const hostedUrl = `${origin}/f/${workspaceSlug}/${formSlug}`;

  const embedSnippet = `<!-- Feedback System Widget -->
<script
  src="${origin}/widget.js"
  data-workspace="${workspaceSlug}"
  data-form="${formSlug}"
  defer>
</script>`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(hostedUrl);
    setCopiedLink(true);
    toast.success("Public link copied to clipboard");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(embedSnippet);
    setCopiedCode(true);
    toast.success("Widget embed snippet copied to clipboard");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // SVG QR Code generator representation
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    hostedUrl
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,24,40,0.45)] p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-[520px] rounded-[20px] border border-[#E1E5EB] bg-white p-6 shadow-[0_24px_48px_-12px_rgba(16,24,40,0.25)] dark:border-white/15 dark:bg-[#2C2C2E]">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-[18px] font-semibold text-[#161C26] dark:text-white">
              Share & Embed &ldquo;{formName}&rdquo;
            </h3>
            <p className="mt-1 text-[13px] text-[#556070] dark:text-[#8E8E93]">
              Collect feedback on your website, via direct link, or print a QR code.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#556070] hover:bg-[#F3F5F9] dark:text-[#8E8E93] dark:hover:bg-white/5"
            aria-label="Close share modal"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="mt-5 flex items-center gap-1 rounded-[10px] bg-[#F3F5F9] p-1 dark:bg-white/5">
          <button
            type="button"
            onClick={() => setActiveTab("link")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-[8px] py-2 text-[13px] font-medium transition-all ${
              activeTab === "link"
                ? "bg-white text-[#161C26] shadow-xs dark:bg-[#1C1C1E] dark:text-white"
                : "text-[#556070] hover:text-[#161C26] dark:text-[#8E8E93] dark:hover:text-white"
            }`}
          >
            <Globe className="size-4" />
            <span>Direct Link</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("embed")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-[8px] py-2 text-[13px] font-medium transition-all ${
              activeTab === "embed"
                ? "bg-white text-[#161C26] shadow-xs dark:bg-[#1C1C1E] dark:text-white"
                : "text-[#556070] hover:text-[#161C26] dark:text-[#8E8E93] dark:hover:text-white"
            }`}
          >
            <Code className="size-4" />
            <span>Embed Widget</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("qr")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-[8px] py-2 text-[13px] font-medium transition-all ${
              activeTab === "qr"
                ? "bg-white text-[#161C26] shadow-xs dark:bg-[#1C1C1E] dark:text-white"
                : "text-[#556070] hover:text-[#161C26] dark:text-[#8E8E93] dark:hover:text-white"
            }`}
          >
            <QrCode className="size-4" />
            <span>QR Code</span>
          </button>
        </div>

        {/* Tab 1: Direct Link */}
        {activeTab === "link" && (
          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#161C26] dark:text-white">
                Public URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={hostedUrl}
                  className="h-10 w-full rounded-[10px] border border-[#E1E5EB] bg-[#F7F9FC] px-3 font-mono text-[13px] text-[#161C26] dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-[10px] bg-[#4249C9] px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-[#363BA6]"
                >
                  {copiedLink ? <Check className="size-4" /> : <Copy className="size-4" />}
                  <span>{copiedLink ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            <div className="rounded-[10px] border border-[#E1E5EB] bg-[#F7F9FC] p-3 text-[12px] text-[#556070] dark:border-white/10 dark:bg-white/5 dark:text-[#8E8E93]">
              <p>
                💡 <strong>Tip:</strong> You can append query parameters like{" "}
                <code className="rounded bg-[#EDF0F5] px-1 py-0.5 font-mono dark:bg-white/10">
                  ?ref=newsletter
                </code>{" "}
                or{" "}
                <code className="rounded bg-[#EDF0F5] px-1 py-0.5 font-mono dark:bg-white/10">
                  ?order_id=123
                </code>{" "}
                to automatically track the traffic source.
              </p>
            </div>

            <div className="pt-2">
              <a
                href={hostedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#4249C9] hover:underline dark:text-[#7B82F6]"
              >
                <span>Preview form in new tab</span>
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Tab 2: Embed Widget */}
        {activeTab === "embed" && (
          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#161C26] dark:text-white">
                HTML Embed Code
              </label>
              <p className="mb-2 text-[12px] text-[#556070] dark:text-[#8E8E93]">
                Paste this snippet before the closing{" "}
                <code className="rounded bg-[#EDF0F5] px-1 font-mono dark:bg-white/10">
                  &lt;/body&gt;
                </code>{" "}
                tag of your website.
              </p>
              <pre className="overflow-x-auto rounded-[10px] border border-[#E1E5EB] bg-[#161C26] p-3.5 font-mono text-[12px] leading-relaxed text-slate-200 dark:border-white/10">
                {embedSnippet}
              </pre>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex h-10 cursor-pointer items-center gap-1.5 rounded-[10px] bg-[#4249C9] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#363BA6]"
              >
                {copiedCode ? <Check className="size-4" /> : <Copy className="size-4" />}
                <span>{copiedCode ? "Snippet Copied" : "Copy Snippet"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: QR Code */}
        {activeTab === "qr" && (
          <div className="mt-5 flex flex-col items-center text-center">
            <div className="flex size-48 items-center justify-center rounded-[16px] border border-[#E1E5EB] bg-white p-3 shadow-xs dark:border-white/15">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrApiUrl}
                alt="QR Code to Form"
                className="size-40 rounded-[8px]"
              />
            </div>
            <p className="mt-3 text-[13px] text-[#556070] dark:text-[#8E8E93]">
              Scan to instantly open the mobile-optimized feedback form.
            </p>
            <a
              href={qrApiUrl}
              download={`${formSlug}-qr.png`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 rounded-[10px] border border-[#E1E5EB] bg-white px-4 py-2 text-[13px] font-medium text-[#161C26] transition-colors hover:bg-[#F3F5F9] dark:border-white/15 dark:bg-[#1C1C1E] dark:text-white dark:hover:bg-white/10"
            >
              <span>Download High-Res QR</span>
              <ExternalLink className="size-3.5" />
            </a>
          </div>
        )}

        <div className="mt-6 flex justify-end border-t border-[#E1E5EB] pt-4 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] border border-[#E1E5EB] px-4 py-2 text-[13px] font-medium text-[#161C26] hover:bg-[#F3F5F9] dark:border-white/15 dark:text-white dark:hover:bg-white/5"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

