import { create } from "zustand";
import { authRepository } from "@/repositories/auth.repository";
import type { UserWorkspaceMembershipRead, WorkspaceRead } from "@/types/auth";

interface WorkspaceState {
  workspaces: UserWorkspaceMembershipRead[];
  currentWorkspace: UserWorkspaceMembershipRead | null;
  workspaceDetails: WorkspaceRead | null;
  effectivePermissions: string[];
  isLoading: boolean;
  setWorkspaces: (workspaces: UserWorkspaceMembershipRead[]) => void;
  setCurrentWorkspace: (
    workspace: UserWorkspaceMembershipRead | null,
    permissions?: string[]
  ) => void;
  setWorkspaceDetails: (details: WorkspaceRead | null) => void;
  fetchWorkspaces: () => Promise<UserWorkspaceMembershipRead[]>;
  hasPermission: (permissionId: string) => boolean;
  clear: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  currentWorkspace: null,
  workspaceDetails: null,
  effectivePermissions: [],
  isLoading: false,

  setWorkspaces: (workspaces) => set({ workspaces }),

  setCurrentWorkspace: (workspace, permissions) =>
    set({
      currentWorkspace: workspace,
      effectivePermissions:
        permissions ?? workspace?.effective_permissions ?? [],
    }),

  setWorkspaceDetails: (details) => set({ workspaceDetails: details }),

  fetchWorkspaces: async () => {
    set({ isLoading: true });
    try {
      const workspaces = await authRepository.getWorkspaces();
      set({ workspaces, isLoading: false });
      return workspaces;
    } catch {
      set({ workspaces: [], isLoading: false });
      return [];
    }
  },

  hasPermission: (permissionId: string) => {
    const { effectivePermissions } = get();
    // Superusers or admin wildcard
    if (effectivePermissions.includes("*")) {
      return true;
    }
    return effectivePermissions.includes(permissionId);
  },

  clear: () =>
    set({
      workspaces: [],
      currentWorkspace: null,
      workspaceDetails: null,
      effectivePermissions: [],
      isLoading: false,
    }),
}));

