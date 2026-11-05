import { useWorkspaceStore } from "@/store/workspace.store";

describe("useWorkspaceStore", () => {
  beforeEach(() => {
    useWorkspaceStore.getState().clear();
    vi.clearAllMocks();
  });

  it("should initialize with empty workspaces and null active workspace", () => {
    const state = useWorkspaceStore.getState();
    expect(state.workspaces).toEqual([]);
    expect(state.currentWorkspace).toBeNull();
    expect(state.workspaceDetails).toBeNull();
  });

  it("should update workspaces via setWorkspaces", () => {
    const mockList = [
      {
        workspace_id: "ws-1",
        workspace_name: "Acme",
        workspace_slug: "acme",
        role_id: "role-owner",
        role_slug: "owner",
        role_name: "Owner",
        effective_permissions: ["workspace:read", "taxonomy:manage"],
      },
    ];

    useWorkspaceStore.getState().setWorkspaces(mockList);
    expect(useWorkspaceStore.getState().workspaces).toEqual(mockList);
  });

  it("should check permissions accurately via hasPermission", () => {
    const mockWs = {
      workspace_id: "ws-1",
      workspace_name: "Acme",
      workspace_slug: "acme",
      role_id: "role-admin",
      role_slug: "admin",
      role_name: "Admin",
      effective_permissions: ["taxonomy:read", "taxonomy:manage"],
    };

    useWorkspaceStore.getState().setCurrentWorkspace(mockWs);
    expect(useWorkspaceStore.getState().hasPermission("taxonomy:read")).toBe(true);
    expect(useWorkspaceStore.getState().hasPermission("taxonomy:manage")).toBe(true);
    expect(useWorkspaceStore.getState().hasPermission("workspace:delete")).toBe(false);
  });

  it("should reset state on clear()", () => {
    useWorkspaceStore.getState().setWorkspaces([
      {
        workspace_id: "ws-2",
        workspace_name: "Beta",
        workspace_slug: "beta",
        role_id: "role-owner",
        role_slug: "owner",
        role_name: "Owner",
        effective_permissions: [],
      },
    ]);

    useWorkspaceStore.getState().clear();
    const state = useWorkspaceStore.getState();
    expect(state.workspaces).toEqual([]);
    expect(state.currentWorkspace).toBeNull();
  });
});

