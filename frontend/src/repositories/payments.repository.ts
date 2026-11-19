/**
 * Repository client for Workspace Paddle Billing overview and Customer Portal APIs.
 */

import { apiClient } from "@/repositories/client";
import type {
  BillingOverviewRead,
  PortalSessionRead,
} from "@/types/payments";

export const paymentsRepository = {
  async getBillingOverview(workspaceId: string): Promise<BillingOverviewRead> {
    return apiClient<BillingOverviewRead>(
      `/workspaces/${workspaceId}/billing`,
      { workspaceId }
    );
  },

  async createPortalSession(workspaceId: string): Promise<PortalSessionRead> {
    return apiClient<PortalSessionRead>(
      `/workspaces/${workspaceId}/billing/portal`,
      {
        method: "POST",
        workspaceId,
      }
    );
  },
};
