import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WorkspaceBillingTab } from "@/components/workspace/workspace-billing-tab";
import { openPaddleOverlayCheckout } from "@/lib/paddle";
import { paymentsRepository } from "@/repositories/payments.repository";
import type { BillingOverviewRead } from "@/types/payments";

vi.mock("@/repositories/payments.repository", () => ({
  paymentsRepository: {
    getBillingOverview: vi.fn(),
    createPortalSession: vi.fn(),
  },
}));

vi.mock("@/lib/paddle", () => ({
  openPaddleOverlayCheckout: vi.fn(),
}));

const freeBilling: BillingOverviewRead = {
  workspace_id: "ws-1",
  plan_tier: "free",
  subscription_status: "active",
  billing_interval: null,
  current_period_starts_at: null,
  current_period_ends_at: null,
  cancel_at_period_end: false,
  has_portal_access: false,
  forms_used: 1,
  forms_limit: 2,
  submissions_used: 4,
  submissions_limit: 10,
  cycle_reset_at: "2026-12-16T00:00:00Z",
  checkout: {
    environment: "sandbox",
    client_token: "test_token_123",
    monthly_price_id: "pri_monthly",
    annual_price_id: "pri_annual",
    is_configured: true,
  },
};

const proPastDueBilling: BillingOverviewRead = {
  workspace_id: "ws-1",
  plan_tier: "pro",
  subscription_status: "past_due",
  billing_interval: "year",
  current_period_starts_at: "2026-11-01T00:00:00Z",
  current_period_ends_at: "2027-11-01T00:00:00Z",
  cancel_at_period_end: true,
  has_portal_access: true,
  forms_used: 6,
  forms_limit: 25,
  submissions_used: 340,
  submissions_limit: 2500,
  cycle_reset_at: "2027-11-01T00:00:00Z",
  checkout: freeBilling.checkout,
};

describe("WorkspaceBillingTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Free quotas (10 responses, 2 forms) and opens Paddle checkout with workspace_id", async () => {
    const user = userEvent.setup();
    vi.mocked(paymentsRepository.getBillingOverview).mockResolvedValue(
      freeBilling
    );
    vi.mocked(openPaddleOverlayCheckout).mockResolvedValue(undefined);

    render(
      <WorkspaceBillingTab
        workspaceId="ws-1"
        userId="user-9"
        userEmail="owner@acme.com"
      />
    );

    expect(await screen.findByText(/4 \/ 10/)).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 2/)).toBeInTheDocument();

    // Switch to Annual billing and click Upgrade to Pro
    await user.click(screen.getByRole("button", { name: "Annual" }));
    await user.click(screen.getByRole("button", { name: /Upgrade to Pro/i }));

    await waitFor(() => {
      expect(openPaddleOverlayCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: "sandbox",
          clientToken: "test_token_123",
          priceId: "pri_annual",
          workspaceId: "ws-1",
          userId: "user-9",
          email: "owner@acme.com",
        })
      );
    });
  });

  it("shows past_due banner and opens Customer Portal for Pro subscribers", async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    vi.mocked(paymentsRepository.getBillingOverview).mockResolvedValue(
      proPastDueBilling
    );
    vi.mocked(paymentsRepository.createPortalSession).mockResolvedValue({
      url: "https://sandbox-customer-portal.paddle.com/cpl_123",
    });

    render(<WorkspaceBillingTab workspaceId="ws-1" />);

    expect(await screen.findByText(/Payment past due/i)).toBeInTheDocument();
    expect(screen.getByText(/340 \/ 2500/)).toBeInTheDocument();
    expect(screen.getByText(/Billed Annually/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Manage Subscription/i })
    );

    await waitFor(() => {
      expect(paymentsRepository.createPortalSession).toHaveBeenCalledWith("ws-1");
      expect(openSpy).toHaveBeenCalledWith(
        "https://sandbox-customer-portal.paddle.com/cpl_123",
        "_blank",
        "noopener,noreferrer"
      );
    });
    openSpy.mockRestore();
  });
});
