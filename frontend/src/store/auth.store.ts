import { create } from "zustand";
import { authRepository } from "@/repositories/auth.repository";
import type { UserMeRead } from "@/types/auth";

interface AuthState {
  user: UserMeRead | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: UserMeRead | null) => void;
  fetchMe: () => Promise<UserMeRead | null>;
  logout: () => Promise<void>;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),

  fetchMe: async () => {
    set({ isLoading: true });
    try {
      const user = await authRepository.getMe();
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
      return user;
    } catch {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return null;
    }
  },

  logout: async () => {
    try {
      await authRepository.logout();
    } catch {
      // Ignore logout network failure, clear local state regardless
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  clear: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),
}));

