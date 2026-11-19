"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { openPaddleOverlayCheckout } from "@/lib/paddle";
import { paymentsRepository } from "@/repositories/payments.repository";
import type { BillingOverviewRead } from "@/types/payments";

interface WorkspaceBillingTabProps {
  workspaceId: string;
  userId?: string;
  userEmail?: string;
  onPlanUpdated?: () => void;
}

function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function progressPercent(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function WorkspaceBillingTab({
  workspaceId,
  userId,
  userEmail,
  onPlanUpdated,
}: WorkspaceBillingTabProps) {
  const [billing, setBilling] = useState<BillingOverviewRead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [interval, setIntervalChoice] = useState<"month" | "year">("month");
  const [isOpeningCheckout, setIsOpeningCheckout] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [isSyncingCheckout, setIsSyncingCheckout] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadBilling = useCallback(async () => {
    try {
      const data = await paymentsRepository.getBillingOverview(workspaceId);
      setBilling(data);
      return data;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to load billing details";
      toast.error(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    let active = true;
    paymentsRepository
      .getBillingOverview(workspaceId)
      .then((data) => {
        if (active) setBilling(data);
      })
      .catch((err: unknown) => {
        if (active) {
          const msg =
            err instanceof Error
              ? err.message
              : "Failed to load billing details";
          toast.error(msg);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [workspaceId]);

  const handleCheckoutCompleted = () => {
    setIsSyncingCheckout(true);
    toast.success("Payment received! Activating Pro plan…");

    let attempts = 0;
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }
    pollTimerRef.current = setInterval(async () => {
      attempts += 1;
      const latest = await loadBilling();
      if (latest?.plan_tier === "pro" || attempts >= 10) {
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        setIsSyncingCheckout(false);
        if (latest?.plan_tier === "pro") {
          toast.success("Pro plan is now active!");
          onPlanUpdated?.();
        }
      }
    }, 2000);
  };

  const handleUpgrade = async () => {
    if (!billing) return;
    const priceId =
      interval === "year"
        ? billing.checkout.annual_price_id || billing.checkout.monthly_price_id
        : billing.checkout.monthly_price_id || billing.checkout.annual_price_id;

    if (!billing.checkout.is_configured || !priceId) {
      toast.error(
        "Paddle checkout is not configured yet. Set PADDLE_CLIENT_TOKEN and Pro Price IDs."
      );
      return;
    }

    setIsOpeningCheckout(true);
    try {
      await openPaddleOverlayCheckout({
        environment: billing.checkout.environment,
        clientToken: billing.checkout.client_token,
        priceId,
        workspaceId,
        userId,
        email: userEmail,
        onCompleted: handleCheckoutCompleted,
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Unable to launch Paddle checkout";
      toast.error(msg);
    } finally {
      setIsOpeningCheckout(false);
    }
  };

  const handleManagePortal = async () => {
    setIsOpeningPortal(true);
    try {
      const res = await paymentsRepository.createPortalSession(workspaceId);
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Unable to open billing portal";
      toast.error(msg);
    } finally {
      setIsOpeningPortal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-36 animate-pulse rounded-[14px] border border-[#E1E5EB] bg-white dark:border-white/10 dark:bg-[#1C1C1E]" />
        <div className="h-44 animate-pulse rounded-[14px] border border-[#E1E5EB] bg-white dark:border-white/10 dark:bg-[#1C1C1E]" />
      </div>
    );
  }

  if (!billing) {
    return (
      <div className="rounded-[14px] border border-[#E1E5EB] bg-white p-6 text-[14px] text-[#556070] dark:border-white/10 dark:bg-[#1C1C1E] dark:text-[#8E8E93]">
        Unable to load workspace billing information.
      </div>
    );
  }

  const isPro = billing.plan_tier === "pro";
  const isPastDue = billing.subscription_status === "past_due";
  const hasAnnual = Boolean(billing.checkout.annual_price_id);

  return (
    <div className="space-y-6">
      {isPastDue && (
        <div className="flex flex-col justify-between gap-3 rounded-[14px] border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center dark:border-amber-500/40 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-[14px] font-semibold text-amber-900 dark:text-amber-200">
                Payment past due
              </p>
              <p className="mt-0.5 text-[13px] text-amber-800 dark:text-amber-300">
                Your recent Pro renewal failed. Your workspace stays on Pro while Paddle retries, or update your card below to avoid losing access.
              </p>
            </div>
          </div>
          {billing.has_portal_access && (
            <button
              type="button"
              onClick={handleManagePortal}
              disabled={isOpeningPortal}
              className="shrink-0 cursor-pointer rounded-[10px] bg-amber-600 px-3.5 py-2 text-[13px] font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              Update payment method
            </button>
          )}
        </div>
      )}

      {/* Current Plan Overview */}
      <section className="rounded-[14px] border border-[#E1E5EB] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-white/10 dark:bg-[#1C1C1E]">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-[16px] font-semibold text-[#161C26] dark:text-white">
                Current Plan:{" "}
                <span className="capitalize">{billing.plan_tier}</span>
              </h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase ${
                  isPastDue
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                    : isPro
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-[#F3F5F9] text-[#556070] dark:bg-white/10 dark:text-[#8E8E93]"
                }`}
              >
                {billing.subscription_status}
              </span>
              {isPro && billing.billing_interval && (
                <span className="rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-[11px] font-medium text-[#363BA6] dark:bg-[#4249C9]/20 dark:text-[#2997FF]">
                  Billed {billing.billing_interval === "year" ? "Annually" : "Monthly"}
                </span>
              )}
            </div>
            <p className="mt-1 text-[13px] text-[#556070] dark:text-[#8E8E93]">
              {isSyncingCheckout
                ? "Confirming your payment with Paddle…"
                : isPro
                  ? billing.cancel_at_period_end
                    ? `Pro access ends on ${formatShortDate(billing.current_period_ends_at)}.`
                    : `Next renewal: ${formatShortDate(billing.current_period_ends_at)}.`
                  : "Free plan includes 10 monthly submissions, 2 forms, 1 connection, and 1 alert rule."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isPro && billing.has_portal_access ? (
              <button
                type="button"
                onClick={handleManagePortal}
                disabled={isOpeningPortal}
                className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-[#E1E5EB] bg-white px-4 py-2 text-[14px] font-medium text-[#161C26] transition-colors hover:bg-[#F5F7FA] disabled:opacity-50 dark:border-white/15 dark:bg-[#2C2C2E] dark:text-white dark:hover:bg-white/5"
              >
                <CreditCard className="size-4" />
                <span>
                  {isOpeningPortal ? "Opening Portal…" : "Manage Subscription"}
                </span>
                <ExternalLink className="size-3.5 text-[#556070]" />
              </button>
            ) : !isPro ? (
              <div className="flex flex-wrap items-center gap-2.5">
                {hasAnnual && (
                  <div className="inline-flex rounded-[10px] border border-[#E1E5EB] bg-[#F7F9FC] p-0.5 dark:border-white/15 dark:bg-[#2C2C2E]">
                    <button
                      type="button"
                      onClick={() => setIntervalChoice("month")}
                      className={`cursor-pointer rounded-[8px] px-3 py-1 text-[12px] font-medium transition-colors ${
                        interval === "month"
                          ? "bg-white text-[#161C26] shadow-xs dark:bg-[#1C1C1E] dark:text-white"
                          : "text-[#556070] dark:text-[#8E8E93]"
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setIntervalChoice("year")}
                      className={`cursor-pointer rounded-[8px] px-3 py-1 text-[12px] font-medium transition-colors ${
                        interval === "year"
                          ? "bg-white text-[#161C26] shadow-xs dark:bg-[#1C1C1E] dark:text-white"
                          : "text-[#556070] dark:text-[#8E8E93]"
                      }`}
                    >
                      Annual
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleUpgrade}
                  disabled={isOpeningCheckout || isSyncingCheckout}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] bg-[#4249C9] px-4 py-2 text-[14px] font-medium text-white shadow-xs transition-colors hover:bg-[#363BA6] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#2997FF] dark:hover:bg-[#0071E3]"
                >
                  <Sparkles className="size-4" />
                  <span>
                    {isOpeningCheckout ? "Loading Checkout…" : "Upgrade to Pro"}
                  </span>
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Live Workspace Quota Usage */}
        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-[#E1E5EB] pt-5 sm:grid-cols-2 dark:border-white/10">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[13px]">
              <span className="font-medium text-[#161C26] dark:text-white">
                Monthly Responses
              </span>
              <span className="tabular-nums text-[#556070] dark:text-[#8E8E93]">
                {billing.submissions_used} / {billing.submissions_limit}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#EDF0F5] dark:bg-white/10">
              <div
                className="h-full rounded-full bg-[#4249C9] dark:bg-[#2997FF]"
                style={{
                  width: `${progressPercent(billing.submissions_used, billing.submissions_limit)}%`,
                }}
              />
            </div>
            <p className="mt-1.5 text-[12px] text-[#556070] dark:text-[#8E8E93]">
              Cycle resets on {formatShortDate(billing.cycle_reset_at)}
            </p>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-[13px]">
              <span className="font-medium text-[#161C26] dark:text-white">
                Active Forms
              </span>
              <span className="tabular-nums text-[#556070] dark:text-[#8E8E93]">
                {billing.forms_used} / {billing.forms_limit}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#EDF0F5] dark:bg-white/10">
              <div
                className="h-full rounded-full bg-[#4249C9] dark:bg-[#2997FF]"
                style={{
                  width: `${progressPercent(billing.forms_used, billing.forms_limit)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Free vs Pro Comparison */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-[14px] border border-[#E1E5EB] bg-white p-5 dark:border-white/10 dark:bg-[#1C1C1E]">
          <h3 className="text-[15px] font-semibold text-[#161C26] dark:text-white">
            Free Plan
          </h3>
          <p className="mt-0.5 text-[13px] text-[#556070] dark:text-[#8E8E93]">
            For trying out collection &amp; Score Drivers
          </p>
          <ul className="mt-4 space-y-2 text-[13px] text-[#556070] dark:text-[#8E8E93]">
            <li>&bull; 10 monthly feedback submissions</li>
            <li>&bull; Up to 2 active forms</li>
            <li>&bull; 1 connection &amp; 1 alert rule setup</li>
            <li>&bull; Email alerts, webhooks &amp; Monday digest not included</li>
          </ul>
        </div>

        <div className="rounded-[14px] border border-[#4249C9]/40 bg-[#F8F9FF] p-5 dark:border-[#2997FF]/40 dark:bg-[#4249C9]/10">
          <h3 className="text-[15px] font-semibold text-[#161C26] dark:text-white">
            Pro Plan
          </h3>
          <p className="mt-0.5 text-[13px] text-[#556070] dark:text-[#8E8E93]">
            For growing startups &amp; teams acting on live feedback
          </p>
          <ul className="mt-4 space-y-2 text-[13px] text-[#161C26] dark:text-white">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-[#4249C9] dark:text-[#2997FF]" />
              <span>2,500 monthly feedback submissions</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-[#4249C9] dark:text-[#2997FF]" />
              <span>Up to 25 active forms</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-[#4249C9] dark:text-[#2997FF]" />
              <span>15 channels, 25 alert rules, 1,000 emails &amp; 10,000 webhooks/mo</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-[#4249C9] dark:text-[#2997FF]" />
              <span>Automated Monday Morning VoC Digest</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
