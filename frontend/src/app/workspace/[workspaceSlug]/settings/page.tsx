"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Briefcase,
  Check,
  Clock,
  Copy,
  Layers,
  Lock,
  Mail,
  Plus,
  Repeat,
  Search,
  ShoppingBag,
  Trash2,
  UserMinus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { authRepository } from "@/repositories/auth.repository";
import { AccountSettingsTab } from "@/components/workspace/account-settings-tab";
import { WorkspaceCategoriesTab } from "@/components/workspace/workspace-categories-tab";
import { WorkspaceIntegrationsTab } from "@/components/workspace/workspace-integrations-tab";
import { useAuthStore } from "@/store/auth.store";
import { useWorkspaceStore } from "@/store/workspace.store";
import type {
  RoleRead,
  WorkspaceInviteRead,
  WorkspaceMemberRead,
  WorkspaceRead,
} from "@/types/auth";

const INDUSTRY_OPTIONS = [
  {
    id: "SaaS and software",
    label: "SaaS and software",
    icon: Layers,
  },
  {
    id: "E-commerce",
    label: "E-commerce",
    icon: ShoppingBag,
  },
  {
    id: "Subscriptions",
    label: "Subscriptions",
    icon: Repeat,
  },
  {
    id: "Services and agency",
    label: "Services and agency",
    icon: Briefcase,
  },
];

const TIMEZONE_OPTIONS = [
  "Asia/Kathmandu",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

function formatExpiresDate(isoString?: string) {
  if (!isoString) return "In 7 days";
  try {
    const exp = new Date(isoString);
    return exp.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "In 7 days";
  }
}

export default function WorkspaceSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const workspaceSlug = params?.workspaceSlug as string;

  const currentTab = searchParams.get("tab") || "general";

  const { user } = useAuthStore();
  const { workspaces, setWorkspaces } = useWorkspaceStore();

  const [isLoading, setIsLoading] = useState(true);
  const [workspace, setWorkspace] = useState<WorkspaceRead | null>(null);
  const [members, setMembers] = useState<WorkspaceMemberRead[]>([]);
  const [roles, setRoles] = useState<RoleRead[]>([]);
  const [invites, setInvites] = useState<WorkspaceInviteRead[]>([]);

  // General tab form state
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("SaaS and software");
  const [timezone, setTimezone] = useState("Asia/Kathmandu");
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);

  // Members tab state
  const [memberSearchQuery, setMemberSearchQuery] = useState("");

  // Modals state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  // Invite Sent confirmation modal
  const [sentInviteLink, setSentInviteLink] = useState<string | null>(null);

  // Delete Workspace modal
  const [isDeleteWsModalOpen, setIsDeleteWsModalOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [isDeletingWs, setIsDeletingWs] = useState(false);

  // Remove Member modal
  const [memberToRemove, setMemberToRemove] =
    useState<WorkspaceMemberRead | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  // Load all workspace data
  useEffect(() => {
    let isMounted = true;

    async function loadWorkspaceData() {
      if (!workspaceSlug) return;

      try {
        let wsList = workspaces;
        if (wsList.length === 0) {
          wsList = await authRepository.getWorkspaces();
          setWorkspaces(wsList);
        }

        const membership = wsList.find(
          (w) => w.workspace_slug.toLowerCase() === workspaceSlug.toLowerCase()
        );
        if (!membership) {
          if (wsList.length > 0) {
            router.replace(`/workspace/${wsList[0].workspace_slug}`);
          } else {
            router.replace("/create-workspace");
          }
          return;
        }

        const [wsDetails, membersList, rolesList, invitesList] =
          await Promise.all([
            authRepository.getWorkspace(membership.workspace_id),
            authRepository.listWorkspaceMembers(membership.workspace_id),
            authRepository.listWorkspaceRoles(membership.workspace_id),
            authRepository.listWorkspaceInvites(membership.workspace_id),
          ]);

        if (!isMounted) return;

        setWorkspace(wsDetails);
        setName(wsDetails.name);
        setIndustry(wsDetails.industry || "SaaS and software");
        setTimezone(wsDetails.timezone || "Asia/Kathmandu");
        setMembers(membersList);
        setRoles(rolesList);
        setInvites(invitesList);

        if (rolesList.length > 0 && !inviteRoleId) {
          // Default invite role to 'Member' or 'Viewer' or last role
          const defaultRole =
            rolesList.find((r) => r.slug === "editor") ||
            rolesList.find((r) => r.slug === "viewer") ||
            rolesList[rolesList.length - 1];
          setInviteRoleId(defaultRole.id);
        }

        setIsLoading(false);
      } catch (err: unknown) {
        if (isMounted) {
          const msg =
            err instanceof Error ? err.message : "Failed to load workspace";
          toast.error(msg);
          setIsLoading(false);
        }
      }
    }

    loadWorkspaceData();

    return () => {
      isMounted = false;
    };
  }, [workspaceSlug, workspaces, router, setWorkspaces, inviteRoleId]);

  const setTab = (
    tab:
      | "general"
      | "members"
      | "invitations"
      | "categories"
      | "integrations"
      | "account"
  ) => {
    router.replace(`/workspace/${workspaceSlug}/settings?tab=${tab}`, {
      scroll: false,
    });
  };

  // Check if current user is owner
  const currentMembership = workspaces.find(
    (w) => w.workspace_slug === workspaceSlug
  );
  const isOwner = currentMembership?.role_slug.toLowerCase() === "owner";

  // General tab change detection
  const hasGeneralChanges =
    workspace &&
    (name.trim() !== workspace.name ||
      industry !== (workspace.industry || "SaaS and software") ||
      timezone !== (workspace.timezone || "Asia/Kathmandu"));

  const handleDiscardGeneral = () => {
    if (!workspace) return;
    setName(workspace.name);
    setIndustry(workspace.industry || "SaaS and software");
    setTimezone(workspace.timezone || "Asia/Kathmandu");
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !name.trim() || !hasGeneralChanges) return;

    setIsSavingGeneral(true);
    try {
      const updated = await authRepository.updateWorkspace(workspace.id, {
        name: name.trim(),
        industry,
        timezone,
      });
      setWorkspace(updated);
      setName(updated.name);
      setIndustry(updated.industry || "SaaS and software");
      setTimezone(updated.timezone || "Asia/Kathmandu");

      // Update store
      const updatedList = workspaces.map((w) =>
        w.workspace_id === workspace.id
          ? { ...w, workspace_name: updated.name }
          : w
      );
      setWorkspaces(updatedList);

      toast.success("Workspace profile updated successfully");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update workspace";
      toast.error(message);
    } finally {
      setIsSavingGeneral(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!workspace || deleteConfirmName.trim() !== workspace.name) return;

    setIsDeletingWs(true);
    try {
      await authRepository.deleteWorkspace(workspace.id);
      toast.success("Workspace deleted successfully");

      const remaining = workspaces.filter(
        (w) => w.workspace_id !== workspace.id
      );
      setWorkspaces(remaining);

      router.replace(
        remaining.length > 0
          ? `/workspace/${remaining[0].workspace_slug}`
          : "/create-workspace"
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete workspace";
      toast.error(message);
      setIsDeletingWs(false);
    }
  };

  // Invite handlers
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !inviteEmail.trim() || !inviteRoleId) return;

    setIsSendingInvite(true);
    try {
      const newInvite = await authRepository.createWorkspaceInvite(
        workspace.id,
        {
          email: inviteEmail.trim(),
          role_id: inviteRoleId,
        }
      );
      setInvites((prev) => [newInvite, ...prev]);
      setIsInviteModalOpen(false);

      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const directLink = newInvite.invite_token
        ? `${origin}/invite?token=${newInvite.invite_token}`
        : `${origin}/invite`;

      setSentInviteLink(directLink);
      setInviteEmail("");
      toast.success("Invitation created successfully");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to send invitation";
      toast.error(message);
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!workspace) return;
    try {
      await authRepository.revokeWorkspaceInvite(workspace.id, inviteId);
      setInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
      toast.success("Invitation revoked");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to revoke invitation";
      toast.error(message);
    }
  };

  const handleCopyInviteLink = (inviteToken?: string | null) => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const url = inviteToken
      ? `${origin}/invite?token=${inviteToken}`
      : `${origin}/invite`;
    navigator.clipboard.writeText(url);
    toast.success("Invite link copied to clipboard");
  };

  // Member role update & remove handlers
  const handleUpdateMemberRole = async (
    targetUserId: string,
    newRoleId: string
  ) => {
    if (!workspace) return;
    try {
      await authRepository.updateMemberRole(workspace.id, targetUserId, {
        role_id: newRoleId,
      });
      const selectedRole = roles.find((r) => r.id === newRoleId);
      setMembers((prev) =>
        prev.map((m) =>
          m.user_id === targetUserId
            ? {
                ...m,
                role_id: newRoleId,
                role_name: selectedRole?.name || m.role_name,
                role_slug: selectedRole?.slug || m.role_slug,
              }
            : m
        )
      );
      toast.success("Member role updated");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update role";
      toast.error(message);
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!workspace || !memberToRemove) return;

    setIsRemovingMember(true);
    try {
      await authRepository.removeMember(
        workspace.id,
        memberToRemove.user_id
      );
      setMembers((prev) =>
        prev.filter((m) => m.user_id !== memberToRemove.user_id)
      );
      toast.success("Member removed from workspace");
      setMemberToRemove(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to remove member";
      toast.error(message);
    } finally {
      setIsRemovingMember(false);
    }
  };

  // Filtered members
  const filteredMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return members;
    const q = memberSearchQuery.toLowerCase().trim();
    return members.filter(
      (m) =>
        (m.full_name || "").toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
    );
  }, [members, memberSearchQuery]);

  const getMemberInitials = (name?: string | null, email?: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "MB";
  };

  const formatJoinedDate = (isoString?: string) => {
    if (!isoString) return "Recently";
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Recently";
    }
  };


  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-[#4249C9] border-t-transparent" />
          <p className="text-sm font-medium text-[#556070] dark:text-[#8E8E93]">
            Loading workspace settings…
          </p>
        </div>
      </div>
    );
  }

  const submissionsCount =
    workspace?.current_cycle_submissions_count || 0;
  const submissionsLimit = workspace?.monthly_submission_limit || 500;
  const usagePercentage = Math.min(
    100,
    Math.round((submissionsCount / Math.max(1, submissionsLimit)) * 100)
  );

  return (
    <div className="w-full max-w-[1000px] pb-12">
      {/* PAGE HEADER */}
      <header className="mb-6">
        <div className="mb-6">
          <div className="mb-1 flex items-center gap-2.5">
            <h1 className="text-[24px] font-semibold leading-8 tracking-tight text-text">
              {workspace?.name}
            </h1>
            {isOwner ? (
              <span className="rounded-[6px] bg-action-subtle px-2 py-0.5 text-[12px] font-medium text-action-subtle-fg">
                Owner
              </span>
            ) : (
              <span className="rounded-[6px] bg-subtle px-2 py-0.5 text-[12px] font-medium text-text-muted">
                {currentMembership?.role_name || "Member"}
              </span>
            )}
          </div>
          <p className="text-[14px] text-text-muted">
            Manage your workspace profile, usage and team members.
          </p>
        </div>

        {/* UNDERLINE TAB BAR (5 TABS) */}
        <div className="flex items-center gap-8 border-b border-border">
          {/* General Tab */}
          <button
            type="button"
            onClick={() => setTab("general")}
            className={`relative pb-3 text-[14px] transition-colors cursor-pointer ${
              currentTab === "general"
                ? "font-semibold text-text"
                : "font-medium text-text-muted hover:text-text"
            }`}
          >
            General
            {currentTab === "general" && (
              <div className="absolute right-0 bottom-0 left-0 h-[2px] bg-action" />
            )}
          </button>

          {/* Members Tab */}
          <button
            type="button"
            onClick={() => setTab("members")}
            className={`relative flex items-center gap-2 pb-3 text-[14px] transition-colors cursor-pointer ${
              currentTab === "members"
                ? "font-semibold text-text"
                : "font-medium text-text-muted hover:text-text"
            }`}
          >
            <span>Members</span>
            <span className="rounded-[6px] bg-subtle px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-text-muted">
              {members.length}
            </span>
            {currentTab === "members" && (
              <div className="absolute right-0 bottom-0 left-0 h-[2px] bg-action" />
            )}
          </button>

          {/* Invitations Tab */}
          <button
            type="button"
            onClick={() => setTab("invitations")}
            className={`relative flex items-center gap-2 pb-3 text-[14px] transition-colors cursor-pointer ${
              currentTab === "invitations"
                ? "font-semibold text-text"
                : "font-medium text-text-muted hover:text-text"
            }`}
          >
            <span>Invitations</span>
            <span className="rounded-[6px] bg-subtle px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-text-muted">
              {invites.length}
            </span>
            {currentTab === "invitations" && (
              <div className="absolute right-0 bottom-0 left-0 h-[2px] bg-action" />
            )}
          </button>

          {/* Categories Tab */}
          <button
            type="button"
            onClick={() => setTab("categories")}
            className={`relative flex items-center gap-2 pb-3 text-[14px] transition-colors cursor-pointer ${
              currentTab === "categories"
                ? "font-semibold text-text"
                : "font-medium text-text-muted hover:text-text"
            }`}
          >
            <span>Categories</span>
            {currentTab === "categories" && (
              <div className="absolute right-0 bottom-0 left-0 h-[2px] bg-action" />
            )}
          </button>

          {/* Integrations & Outbound Webhooks Tab */}
          <button
            type="button"
            onClick={() => setTab("integrations")}
            className={`relative flex items-center gap-2 pb-3 text-[14px] transition-colors cursor-pointer ${
              currentTab === "integrations"
                ? "font-semibold text-text"
                : "font-medium text-text-muted hover:text-text"
            }`}
          >
            <span>Integrations</span>
            {currentTab === "integrations" && (
              <div className="absolute right-0 bottom-0 left-0 h-[2px] bg-action" />
            )}
          </button>

          {/* Account & Security Tab */}
          <button
            type="button"
            onClick={() => setTab("account")}
            className={`relative flex items-center gap-2 pb-3 text-[14px] transition-colors cursor-pointer ${
              currentTab === "account"
                ? "font-semibold text-text"
                : "font-medium text-text-muted hover:text-text"
            }`}
          >
            <span>My Profile & Security</span>
            {currentTab === "account" && (
              <div className="absolute right-0 bottom-0 left-0 h-[2px] bg-action" />
            )}
          </button>
        </div>
      </header>

      {/* ================= TAB 1: GENERAL SETTINGS ================= */}
      {currentTab === "general" && (
        <div className="space-y-6">
          {/* Card 1: Workspace Profile */}
          <section className="overflow-hidden rounded-[14px] border border-[#E1E5EB] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-white/10 dark:bg-[#1C1C1E]">
            <div className="p-6">
              <h2 className="text-[16px] font-semibold text-[#161C26] dark:text-white">
                Workspace profile
              </h2>
              <p className="mt-0.5 text-[13px] text-[#556070] dark:text-[#8E8E93]">
                Update your workspace name, industry and timezone.
              </p>
            </div>

            <div className="divide-y divide-[#E1E5EB] border-t border-[#E1E5EB] dark:divide-white/10 dark:border-white/10">
              {/* Row 1: Name */}
              <div className="flex flex-col gap-6 p-6 md:flex-row md:items-start">
                <div className="w-[240px] shrink-0">
                  <label
                    htmlFor="input-ws-name"
                    className="block text-[14px] font-medium text-[#161C26] dark:text-white"
                  >
                    Name
                  </label>
                  <p className="mt-0.5 text-[13px] text-[#556070] dark:text-[#8E8E93]">
                    1 to 255 characters
                  </p>
                </div>
                <div className="w-full flex-1">
                  <input
                    id="input-ws-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 w-full rounded-[10px] border border-[#E1E5EB] bg-white px-3 text-[14px] text-[#161C26] transition-colors focus:border-[#4249C9] focus:outline-none dark:border-white/15 dark:bg-[#2C2C2E] dark:text-white"
                  />
                </div>
              </div>

              {/* Row 2: URL Slug */}
              <div className="flex flex-col gap-6 p-6 md:flex-row md:items-start">
                <div className="w-[240px] shrink-0">
                  <span className="block text-[14px] font-medium text-[#161C26] dark:text-white">
                    URL
                  </span>
                  <p className="mt-0.5 text-[13px] text-[#556070] dark:text-[#8E8E93]">
                    Changing this would break existing links.
                  </p>
                </div>
                <div className="w-full flex-1">
                  <div className="flex h-10 items-center justify-between rounded-lg border border-[#E1E5EB] bg-[#F7F9FC] px-3 text-[#667284] dark:border-white/10 dark:bg-white/5 dark:text-[#8E8E93]">
                    <div className="truncate font-mono text-[13px]">
                      <span className="text-[#8e98a8]">workspace/</span>
                      <span className="font-medium text-[#161C26] dark:text-white">
                        {workspace?.slug}
                      </span>
                    </div>
                    <Lock className="size-4 shrink-0 text-[#667284]" />
                  </div>
                </div>
              </div>

              {/* Row 3: Industry */}
              <div className="flex flex-col gap-6 p-6 md:flex-row md:items-start">
                <div className="w-[240px] shrink-0">
                  <span className="block text-[14px] font-medium text-[#161C26] dark:text-white">
                    Industry
                  </span>
                  <p className="mt-0.5 text-[13px] text-[#556070] dark:text-[#8E8E93]">
                    Helps tailor categorizations and templates.
                  </p>
                </div>
                <div className="w-full flex-1">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {INDUSTRY_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = industry === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setIndustry(opt.id)}
                          className={`flex h-12 cursor-pointer items-center justify-between rounded-lg px-3 text-left transition-colors ${
                            isSelected
                              ? "border border-[#4249C9] bg-[#F0F2FE] text-[#363BA6] dark:border-[#2997FF] dark:bg-[#4249C9]/20 dark:text-[#2997FF]"
                              : "border border-[#E1E5EB] bg-white text-[#161C26] hover:border-[#C9CFD9] dark:border-white/15 dark:bg-[#2C2C2E] dark:text-white dark:hover:border-white/30"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <Icon className="size-4 shrink-0" />
                            <span className="truncate text-[14px] font-medium">
                              {opt.label}
                            </span>
                          </div>
                          {isSelected && (
                            <Check className="size-4 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Row 4: Timezone */}
              <div className="flex flex-col gap-6 p-6 md:flex-row md:items-start">
                <div className="w-[240px] shrink-0">
                  <label
                    htmlFor="select-timezone"
                    className="block text-[14px] font-medium text-[#161C26] dark:text-white"
                  >
                    Timezone
                  </label>
                  <p className="mt-0.5 text-[13px] text-[#556070] dark:text-[#8E8E93]">
                    Used for cycle reset dates and weekly digests.
                  </p>
                </div>
                <div className="w-full flex-1">
                  <div className="relative">
                    <Clock className="pointer-events-none absolute top-3 left-3 size-4 text-[#556070] dark:text-[#8E8E93]" />
                    <select
                      id="select-timezone"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="h-10 w-full cursor-pointer appearance-none rounded-[10px] border border-[#E1E5EB] bg-white pr-9 pl-9 text-[14px] text-[#161C26] transition-colors focus:border-[#4249C9] focus:outline-none dark:border-white/15 dark:bg-[#2C2C2E] dark:text-white"
                    >
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Action Strip */}
            <div className="flex h-14 items-center justify-end gap-3 rounded-b-[14px] border-t border-[#E1E5EB] bg-[#F7F9FC] px-6 dark:border-white/10 dark:bg-white/5">
              <button
                type="button"
                onClick={handleDiscardGeneral}
                disabled={!hasGeneralChanges || isSavingGeneral}
                className="cursor-pointer rounded-[10px] px-3.5 py-2 text-[14px] font-medium text-[#556070] transition-colors hover:text-[#161C26] disabled:cursor-not-allowed disabled:opacity-50 dark:text-[#8E8E93] dark:hover:text-white"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleSaveGeneral}
                disabled={!hasGeneralChanges || isSavingGeneral}
                className="cursor-pointer rounded-[10px] bg-[#4249C9] px-4 py-2 text-[14px] font-medium text-white shadow-xs transition-colors hover:bg-[#363BA6] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#2997FF] dark:hover:bg-[#0071E3]"
              >
                {isSavingGeneral ? "Saving…" : "Save changes"}
              </button>
            </div>
          </section>

          {/* Card 2: Usage */}
          <section className="rounded-[14px] border border-[#E1E5EB] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-white/10 dark:bg-[#1C1C1E]">
            <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-[14px] font-medium text-[#161C26] dark:text-white">
                  Monthly responses
                </h3>
                <p className="mt-0.5 text-[13px] text-[#556070] dark:text-[#8E8E93]">
                  Resets monthly based on your plan
                </p>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[28px] font-semibold leading-none tabular-nums text-[#161C26] dark:text-white">
                  {submissionsCount}
                </span>
                <span className="text-[14px] text-[#556070] dark:text-[#8E8E93]">
                  of {submissionsLimit} used
                </span>
              </div>
            </div>

            <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-[#EDF0F5] dark:bg-white/10">
              <div
                className="h-full rounded-full bg-[#4249C9] dark:bg-[#2997FF]"
                style={{ width: `${usagePercentage}%` }}
              />
            </div>

            <p className="text-[13px] text-[#556070] dark:text-[#8E8E93]">
              Small samples are fine. AI themes appear from 30 responses.
            </p>
          </section>

          {/* Card 3: Delete Workspace (Owner Only) */}
          {isOwner && (
            <section className="rounded-[14px] border border-[#F3B8B3] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-red-900/40 dark:bg-[#1C1C1E]">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-[14px] font-semibold text-[#161C26] dark:text-white">
                    Delete this workspace
                  </h3>
                  <p className="mt-0.5 text-[13px] text-[#556070] dark:text-[#8E8E93]">
                    Permanently deletes all responses, themes, forms and members.
                    This cannot be undone.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmName("");
                    setIsDeleteWsModalOpen(true);
                  }}
                  className="cursor-pointer rounded-[10px] border border-[#C0281B] bg-white px-4 py-2 text-[14px] font-medium text-[#C0281B] transition-colors hover:bg-[#FDEBE9] dark:border-red-900/60 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  Delete workspace
                </button>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ================= TAB 2: MEMBERS ================= */}
      {currentTab === "members" && (
        <div className="w-full">
          {/* TOOLBAR */}
          <div className="mb-4 flex items-center justify-between">
            <div className="relative w-[260px]">
              <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-[#556070] dark:text-[#8E8E93]" />
              <input
                type="text"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                placeholder="Search members"
                className="h-9 w-full rounded-[10px] border border-[#E1E5EB] bg-white pr-3 pl-9 text-[13px] text-[#161C26] placeholder:text-[#556070] transition-colors focus:border-[#4249C9] focus:outline-none dark:border-white/15 dark:bg-[#1C1C1E] dark:text-white dark:placeholder:text-[#8E8E93]"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(true)}
              className="flex h-10 cursor-pointer items-center gap-2 rounded-[10px] bg-[#4249C9] px-4 text-[14px] font-medium text-white shadow-xs transition-colors hover:bg-[#363BA6] dark:bg-[#2997FF] dark:hover:bg-[#0071E3]"
            >
              <Plus className="size-4" />
              <span>Invite teammate</span>
            </button>
          </div>

          {/* TABLE CARD */}
          <div className="overflow-hidden rounded-[14px] border border-[#E1E5EB] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-white/10 dark:bg-[#1C1C1E]">
            {/* Table Header */}
            <div className="flex h-11 items-center border-b border-[#E1E5EB] bg-[#F7F9FC] px-6 text-[13px] font-medium text-[#556070] dark:border-white/10 dark:bg-white/5 dark:text-[#8E8E93]">
              <div className="flex-1">Member</div>
              <div className="w-[140px]">Role</div>
              <div className="w-[130px]">Joined</div>
              <div className="w-[80px] text-right">Actions</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-[#E1E5EB] dark:divide-white/10">
              {filteredMembers.map((member) => {
                const isCurrentUser = member.user_id === user?.id;
                const isMemberOwner =
                  member.role_slug.toLowerCase() === "owner";

                return (
                  <div
                    key={member.id || member.user_id}
                    className="flex h-14 items-center px-6 transition-colors hover:bg-[#F5F7FA] dark:hover:bg-white/5"
                  >
                    {/* Member Column */}
                    <div className="flex min-w-0 flex-1 items-center pr-4">
                      <div className="mr-3 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#EDF0F5] text-[12px] font-semibold text-[#3B4252] dark:bg-white/10 dark:text-[#8E8E93]">
                        {getMemberInitials(member.full_name, member.email)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[14px] font-medium text-[#161C26] dark:text-white">
                            {member.full_name || member.email.split("@")[0]}
                          </span>
                          {isCurrentUser && (
                            <span className="shrink-0 rounded bg-[#EDF0F5] px-1.5 py-0.5 text-[11px] font-medium text-[#556070] dark:bg-white/10 dark:text-[#8E8E93]">
                              You
                            </span>
                          )}
                        </div>
                        <div className="truncate text-[13px] text-[#667284] dark:text-[#8E8E93]">
                          {member.email}
                        </div>
                      </div>
                    </div>

                    {/* Role Column */}
                    <div className="flex w-[140px] items-center">
                      {isMemberOwner ? (
                        <span className="inline-flex items-center rounded-md bg-[#F0F2FE] px-2.5 py-1 text-[12px] font-medium text-[#363BA6] dark:bg-[#4249C9]/20 dark:text-[#2997FF]">
                          Owner
                        </span>
                      ) : isOwner ? (
                        <select
                          value={member.role_id}
                          onChange={(e) =>
                            handleUpdateMemberRole(
                              member.user_id,
                              e.target.value
                            )
                          }
                          className="h-8 w-[110px] cursor-pointer rounded-lg border border-[#E1E5EB] bg-white px-2 text-[12px] font-medium text-[#161C26] transition-colors focus:border-[#4249C9] focus:outline-none dark:border-white/15 dark:bg-[#2C2C2E] dark:text-white"
                        >
                          {roles
                            .filter((r) => r.slug.toLowerCase() !== "owner")
                            .map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                        </select>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-[#EDF0F5] px-2.5 py-1 text-[12px] font-medium text-[#556070] dark:bg-white/10 dark:text-[#8E8E93]">
                          {member.role_name}
                        </span>
                      )}
                    </div>

                    {/* Joined Column */}
                    <div className="w-[130px] text-[13px] text-[#556070] dark:text-[#8E8E93]">
                      {formatJoinedDate(member.created_at)}
                    </div>

                    {/* Actions Column */}
                    <div className="flex w-[80px] justify-end">
                      {isMemberOwner || isCurrentUser || !isOwner ? (
                        <button
                          type="button"
                          disabled
                          title="This member cannot be removed"
                          className="flex size-8 cursor-not-allowed items-center justify-center rounded-lg text-[#8e98a8] opacity-50"
                        >
                          <UserMinus className="size-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setMemberToRemove(member)}
                          title="Remove member"
                          className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#556070] transition-colors hover:bg-red-50 hover:text-red-600 dark:text-[#8E8E93] dark:hover:bg-red-950/20 dark:hover:text-red-400"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Strip */}
            <div className="flex h-14 items-center justify-between border-t border-[#E1E5EB] bg-[#F7F9FC] px-6 text-[13px] text-[#556070] dark:border-white/10 dark:bg-white/5 dark:text-[#8E8E93]">
              <div>
                Showing 1 to {filteredMembers.length} of {members.length} member
                {members.length === 1 ? "" : "s"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: INVITATIONS ================= */}
      {currentTab === "invitations" && (
        <div className="w-full">
          {/* TOOLBAR */}
          <div className="mb-4 flex items-center justify-end">
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(true)}
              className="flex h-10 cursor-pointer items-center gap-2 rounded-[10px] bg-[#4249C9] px-4 text-[14px] font-medium text-white shadow-xs transition-colors hover:bg-[#363BA6] dark:bg-[#2997FF] dark:hover:bg-[#0071E3]"
            >
              <Plus className="size-4" />
              <span>Invite teammate</span>
            </button>
          </div>

          {/* TABLE CARD */}
          <div className="overflow-hidden rounded-[14px] border border-[#E1E5EB] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-white/10 dark:bg-[#1C1C1E]">
            {invites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[#EDF0F5] text-[#556070] dark:bg-white/10 dark:text-[#8E8E93]">
                  <Mail className="size-5" />
                </div>
                <div className="text-center text-[16px] font-semibold text-[#161C26] dark:text-white">
                  No pending invitations
                </div>
                <p className="mt-1 text-center text-[14px] text-[#556070] dark:text-[#8E8E93]">
                  Invite your colleagues to collaborate on this workspace.
                </p>
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(true)}
                  className="mt-4 flex h-9 cursor-pointer items-center gap-2 rounded-[10px] bg-[#4249C9] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#363BA6] dark:bg-[#2997FF] dark:hover:bg-[#0071E3]"
                >
                  <Plus className="size-4" />
                  <span>Invite teammate</span>
                </button>
              </div>
            ) : (
              <>
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="h-11 border-b border-[#E1E5EB] bg-[#F7F9FC] text-[13px] font-medium text-[#556070] dark:border-white/10 dark:bg-white/5 dark:text-[#8E8E93]">
                      <th className="px-6 font-medium text-left">Email</th>
                      <th className="px-6 font-medium text-left">Role</th>
                      <th className="px-6 font-medium text-left">Expires</th>
                      <th className="px-6 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1E5EB] dark:divide-white/10">
                    {invites.map((invite) => {
                      const roleObj = roles.find(
                        (r) => r.id === invite.role_id
                      );
                      const roleName = roleObj?.name || "Member";
                      return (
                        <tr
                          key={invite.id}
                          className="h-14 transition-colors hover:bg-[#F3F5F9] dark:hover:bg-white/5"
                        >
                          <td className="px-6">
                            <span className="text-[14px] font-medium text-[#161C26] dark:text-white">
                              {invite.email}
                            </span>
                          </td>
                          <td className="px-6">
                            <span className="inline-flex items-center rounded-md bg-[#EDF0F5] px-2 py-0.5 text-[12px] font-medium text-[#556070] dark:bg-white/10 dark:text-[#8E8E93]">
                              {roleName}
                            </span>
                          </td>
                          <td className="px-6">
                            <span className="text-[13px] text-[#556070] dark:text-[#8E8E93]">
                              {formatExpiresDate(invite.expires_at)}
                            </span>
                          </td>
                          <td className="px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Copy Link Button */}
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopyInviteLink(invite.invite_token)
                                }
                                title="Copy invite link"
                                className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#556070] transition-colors hover:bg-[#EDF0F5] hover:text-[#161C26] dark:text-[#8E8E93] dark:hover:bg-white/10 dark:hover:text-white"
                              >
                                <Copy className="size-4" />
                              </button>
                              {/* Revoke Invite Button */}
                              <button
                                type="button"
                                onClick={() => handleRevokeInvite(invite.id)}
                                title="Revoke invite"
                                className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#C0281B] transition-colors hover:bg-[#FDECEB] dark:text-red-400 dark:hover:bg-red-950/20"
                              >
                                <X className="size-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Table Footer Strip */}
                <div className="flex h-14 items-center justify-between border-t border-[#E1E5EB] bg-[#F7F9FC] px-6 text-[13px] text-[#556070] dark:border-white/10 dark:bg-white/5 dark:text-[#8E8E93]">
                  <span>
                    Showing 1 to {invites.length} of {invites.length}{" "}
                    invitation{invites.length === 1 ? "" : "s"}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 4: CATEGORIES ================= */}
      {currentTab === "categories" && workspace && (
        <WorkspaceCategoriesTab
          workspaceId={workspace.id}
          isOwner={isOwner}
        />
      )}

      {/* ================= TAB 5: INTEGRATIONS & OUTBOUND ALERTS ================= */}
      {currentTab === "integrations" && workspace && (
        <WorkspaceIntegrationsTab
          workspaceId={workspace.id}
          isOwner={isOwner}
        />
      )}

      {/* ================= TAB 6: MY PROFILE & SECURITY ================= */}
      {currentTab === "account" && <AccountSettingsTab />}

      {/* ================= MODAL 1: INVITE TEAMMATE ================= */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,24,40,0.45)] backdrop-blur-[2px]">
          <div className="w-full max-w-[460px] rounded-[20px] border border-[#E1E5EB] bg-white p-6 shadow-[0_24px_48px_-12px_rgba(16,24,40,0.25)] dark:border-white/15 dark:bg-[#2C2C2E]">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[18px] font-semibold text-[#161C26] dark:text-white">
                  Invite teammate
                </h3>
                <p className="mt-1 text-[14px] text-[#556070] dark:text-[#8E8E93]">
                  Send an invitation link to collaborate on this workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#556070] hover:bg-[#F3F5F9] dark:text-[#8E8E93] dark:hover:bg-white/5"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#161C26] dark:text-white">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="h-10 w-full rounded-[10px] border border-[#E1E5EB] px-3.5 text-[14px] text-[#161C26] transition-colors focus:border-[#4249C9] focus:outline-none dark:border-white/15 dark:bg-[#1C1C1E] dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#161C26] dark:text-white">
                  Role
                </label>
                <select
                  value={inviteRoleId}
                  onChange={(e) => setInviteRoleId(e.target.value)}
                  className="h-10 w-full cursor-pointer rounded-[10px] border border-[#E1E5EB] bg-white px-3 text-[14px] text-[#161C26] transition-colors focus:border-[#4249C9] focus:outline-none dark:border-white/15 dark:bg-[#1C1C1E] dark:text-white"
                >
                  {roles
                    .filter((r) => r.slug.toLowerCase() !== "owner")
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} — {r.description || "Workspace member"}
                      </option>
                    ))}
                </select>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="h-10 cursor-pointer rounded-[10px] border border-[#E1E5EB] bg-white px-4 text-[14px] font-medium text-[#161C26] transition-colors hover:bg-[#F5F7FA] dark:border-white/15 dark:bg-[#1C1C1E] dark:text-white dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingInvite || !inviteEmail.trim()}
                  className="cursor-pointer rounded-[10px] bg-[#4249C9] px-4 py-2 text-[14px] font-medium text-white shadow-xs transition-colors hover:bg-[#363BA6] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#2997FF] dark:hover:bg-[#0071E3]"
                >
                  {isSendingInvite ? "Sending…" : "Send invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: INVITE SENT CONFIRMATION ================= */}
      {sentInviteLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,24,40,0.45)] backdrop-blur-[2px]">
          <div className="w-full max-w-[460px] rounded-[20px] border border-[#E1E5EB] bg-white p-6 shadow-[0_24px_48px_-12px_rgba(16,24,40,0.25)] dark:border-white/15 dark:bg-[#2C2C2E]">
            <div className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#E8F6EE] text-[#17794A] dark:bg-emerald-950/50 dark:text-emerald-400">
                <Check className="size-5" />
              </div>
              <div className="pt-0.5">
                <h3 className="text-[18px] font-semibold text-[#161C26] dark:text-white">
                  Invitation created
                </h3>
                <p className="mt-1 text-[14px] text-[#556070] dark:text-[#8E8E93]">
                  Share this invitation link directly with your teammate:
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-[10px] border border-[#E1E5EB] bg-[#F7F9FC] p-2 dark:border-white/10 dark:bg-white/5">
              <input
                type="text"
                readOnly
                value={sentInviteLink}
                className="w-full bg-transparent px-2 font-mono text-[13px] text-[#161C26] focus:outline-none dark:text-white"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(sentInviteLink);
                  toast.success("Link copied to clipboard");
                }}
                className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-[8px] bg-white px-3 text-[12px] font-medium text-[#161C26] shadow-xs hover:bg-[#F3F5F9] dark:bg-[#1C1C1E] dark:text-white"
              >
                <Copy className="size-3.5" />
                <span>Copy</span>
              </button>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSentInviteLink(null)}
                className="cursor-pointer rounded-[10px] bg-[#4249C9] px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-[#363BA6] dark:bg-[#2997FF] dark:hover:bg-[#0071E3]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: CONFIRM DELETE WORKSPACE ================= */}
      {isDeleteWsModalOpen && workspace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,24,40,0.45)] backdrop-blur-[2px]">
          <div className="w-full max-w-[460px] rounded-[20px] border border-[#E1E5EB] bg-white p-6 shadow-[0_24px_48px_-12px_rgba(16,24,40,0.25)] dark:border-white/15 dark:bg-[#2C2C2E]">
            <div className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FDEBE9] text-[#C0281B] dark:bg-red-950/50 dark:text-red-400">
                <AlertTriangle className="size-5" />
              </div>
              <div className="pt-0.5">
                <h3 className="text-[18px] font-semibold text-[#161C26] dark:text-white">
                  Delete {workspace.name}?
                </h3>
                <p className="mt-1 text-[14px] text-[#556070] dark:text-[#8E8E93]">
                  This action is permanent and cannot be undone. To confirm,
                  type the workspace name below:
                </p>
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block font-mono text-[13px] text-[#161C26] dark:text-white">
                Type{" "}
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {workspace.name}
                </span>
              </label>
              <input
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={workspace.name}
                className="h-10 w-full rounded-[10px] border border-[#E1E5EB] px-3.5 text-[14px] text-[#161C26] transition-colors focus:border-[#C0281B] focus:outline-none dark:border-white/15 dark:bg-[#1C1C1E] dark:text-white"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDeleteWsModalOpen(false)}
                disabled={isDeletingWs}
                className="h-10 cursor-pointer rounded-[10px] border border-[#E1E5EB] bg-white px-4 text-[14px] font-medium text-[#161C26] transition-colors hover:bg-[#F5F7FA] dark:border-white/15 dark:bg-[#1C1C1E] dark:text-white dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteWorkspace}
                disabled={
                  isDeletingWs || deleteConfirmName.trim() !== workspace.name
                }
                className={`h-10 rounded-[10px] px-4 text-[14px] font-medium transition-colors ${
                  deleteConfirmName.trim() !== workspace.name
                    ? "cursor-not-allowed bg-[#E1E5EB] text-[#8C96A5] dark:bg-white/10 dark:text-white/30"
                    : "cursor-pointer bg-[#C0281B] text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                }`}
              >
                {isDeletingWs ? "Deleting…" : "Delete workspace"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: CONFIRM REMOVE MEMBER ================= */}
      {memberToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,24,40,0.45)] backdrop-blur-[2px]">
          <div className="w-full max-w-[440px] rounded-[20px] border border-[#E1E5EB] bg-white p-6 shadow-[0_24px_48px_-12px_rgba(16,24,40,0.25)] dark:border-white/15 dark:bg-[#2C2C2E]">
            <div className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FDEBE9] text-[#C0281B] dark:bg-red-950/50 dark:text-red-400">
                <UserMinus className="size-5" />
              </div>
              <div className="pt-0.5">
                <h3 className="text-[18px] font-semibold text-[#161C26] dark:text-white">
                  Remove {memberToRemove.full_name || memberToRemove.email}?
                </h3>
                <p className="mt-1 text-[14px] text-[#556070] dark:text-[#8E8E93]">
                  They will immediately lose access to this workspace and all its
                  data.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                disabled={isRemovingMember}
                className="h-10 cursor-pointer rounded-[10px] border border-[#E1E5EB] bg-white px-4 text-[14px] font-medium text-[#161C26] transition-colors hover:bg-[#F5F7FA] dark:border-white/15 dark:bg-[#1C1C1E] dark:text-white dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveMember}
                disabled={isRemovingMember}
                className="cursor-pointer rounded-[10px] bg-[#C0281B] px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
              >
                {isRemovingMember ? "Removing…" : "Remove member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
