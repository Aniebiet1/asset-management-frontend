import { create } from "zustand";
import type { CurrentUser, Organization } from "@/types";
import { mockCurrentUser, mockOrg, mockUsers } from "@/lib/mock-data";

interface AuthState {
  currentUser: CurrentUser | null;
  org: Organization | null;
  isAuthenticated: boolean;
  setCurrentUser: (user: CurrentUser | null) => void;
  setOrg: (org: Organization | null) => void;
  logout: () => void;
  /** Phase-1-only: swap the signed-in persona to preview role-scoped views, mirrors
   * ink-asset-management's Header "Switch Persona" menu. Removed once real auth (Phase 2,
   * plan §C) replaces this store's mock bootstrapping. */
  switchPersona: (userId: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Phase 1: signed in by default with mock data so every page is viewable without a
  // login flow yet. Phase 2 replaces this initial state with `null` + a real /auth/me call.
  currentUser: mockCurrentUser,
  org: mockOrg,
  isAuthenticated: true,

  setCurrentUser: (user) => set({ currentUser: user, isAuthenticated: !!user }),
  setOrg: (org) => set({ org }),
  logout: () => set({ currentUser: null, isAuthenticated: false }),

  switchPersona: (userId) =>
    set((state) => {
      const user = mockUsers.find((u) => u.id === userId);
      if (!user || !state.org) return state;
      return { currentUser: { ...user, orgName: state.org.name } };
    }),
}));
