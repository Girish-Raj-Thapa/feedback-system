"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { notificationsRepository } from "@/repositories/notifications.repository";

function SlackCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const [status, setStatus] = useState<
    "loading" | "success" | "cancelled" | "error"
  >("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function processCallback() {
      // 1. User clicked "Cancel" on Slack consent screen
      if (error === "access_denied" || error) {
        setStatus("cancelled");
        toast.info("Slack connection was cancelled.");
        setTimeout(() => {
          router.replace("/dashboard");
        }, 2000);
        return;
      }

      // 2. Missing authorization code or state token
      if (!code || !state) {
        setStatus("error");
        setErrorMessage("Missing authorization code or state token from Slack.");
        toast.error("Invalid authorization parameters from Slack.");
        return;
      }

      // 3. Exchange code for connection via authenticated backend API
      try {
        const res = await notificationsRepository.completeSlackOAuth({
          code,
          state,
        });

        setStatus("success");
        toast.success(`Connected #${res.channel_name} to your workspace! 🎉`);

        // Redirect directly to the workspace Integrations tab
        setTimeout(() => {
          router.replace(
            `/workspace/${res.workspace_slug}/settings?tab=integrations&connected=slack`
          );
        }, 1200);
      } catch (err: any) {
        const msg =
          err?.data?.message ||
          err?.message ||
          "Failed to complete Slack authorization. Please try again.";
        setStatus("error");
        setErrorMessage(msg);
        toast.error(msg);
      }
    }

    processCallback();
  }, [code, state, error, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl text-center space-y-6 animate-in fade-in-50 zoom-in-95">
        {status === "loading" && (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#4A154B]/10 dark:bg-[#4A154B]/20 text-[#4A154B] dark:text-[#E01E5A] flex items-center justify-center mx-auto text-2xl font-bold">
              #
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                Connecting Slack Channel...
              </h2>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Exchanging secure authorization with Slack and setting up real-time Voice of Customer alerts.
              </p>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold text-foreground">
                Slack Channel Connected!
              </h2>
              <p className="text-xs text-muted-foreground">
                Redirecting you back to Workspace Settings...
              </p>
            </div>
          </div>
        )}

        {status === "cancelled" && (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold text-foreground">
                Installation Cancelled
              </h2>
              <p className="text-xs text-muted-foreground">
                You cancelled the authorization on Slack. Redirecting to your dashboard...
              </p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">
                Connection Failed
              </h2>
              <p className="text-xs text-rose-600 dark:text-rose-400">
                {errorMessage || "Unable to complete Slack authorization."}
              </p>
            </div>
            <button
              onClick={() => router.replace("/dashboard")}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
            >
              Return to Dashboard
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SlackCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SlackCallbackContent />
    </Suspense>
  );
}

