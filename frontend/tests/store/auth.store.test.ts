import { useAuthStore } from "@/store/auth.store";
import { authRepository } from "@/repositories/auth.repository";

jest.mock("@/repositories/auth.repository", () => ({
  authRepository: {
    getMe: jest.fn(),
    logout: jest.fn(),
  },
}));

describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
    jest.clearAllMocks();
  });

  it("should initialize with null user and unauthenticated", () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("should update user and isAuthenticated when setUser is called", () => {
    const mockUser = {
      id: "u-1",
      email: "test@example.com",
      full_name: "Test User",
      is_active: true,
      is_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      workspaces: [],
    };

    useAuthStore.getState().setUser(mockUser);
    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it("should fetch user via getMe on fetchMe", async () => {
    const mockUser = {
      id: "u-2",
      email: "fetched@example.com",
      full_name: "Fetched User",
      is_active: true,
      is_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      workspaces: [],
    };
    (authRepository.getMe as jest.Mock).mockResolvedValue(mockUser);

    const result = await useAuthStore.getState().fetchMe();
    expect(result).toEqual(mockUser);
    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("should clear state on clear()", () => {
    useAuthStore.getState().setUser({
      id: "u-3",
      email: "temp@example.com",
      full_name: "Temp",
      is_active: true,
      is_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      workspaces: [],
    });

    useAuthStore.getState().clear();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});

