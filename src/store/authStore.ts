import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  userId: number;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  updateName: (name: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setAuth: (accessToken, user) => set({ accessToken, user }),
      updateName: (name) =>
        set((state) => ({
          user: state.user ? { ...state.user, name } : null,
        })),
      clearAuth: () => {
        if (typeof window !== "undefined") localStorage.removeItem("accessToken");
        set({ accessToken: null, user: null });
      },
    }),
    { name: "auth" }
  )
);
