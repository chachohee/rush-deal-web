import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  userId: number;
  email: string;
  name: string;
  role: string;
  phone?: string;
  address?: string;
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  updateProfile: (partial: Partial<Pick<User, "name" | "phone" | "address">>) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setAuth: (accessToken, user) => set({ accessToken, user }),
      updateProfile: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),
      clearAuth: () => set({ accessToken: null, user: null }),
    }),
    { name: "auth" }
  )
);
