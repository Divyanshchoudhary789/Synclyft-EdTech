import { create } from "zustand";
import { api } from "../api/api";

export interface User {
  _id?: string;
  name?: string;
  email?: string;
  profilePicture?: string;
  avatarUrl?: string;
  avatar?: string;
  college?: string;
  organization?: string;
  degree?: string;
  role?: "student" | "college-admin" | "super-admin" | string;
  status?: string;
  isEmailVerified?: boolean;
}

interface AuthStore {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  fetchUser: (force?: boolean) => Promise<User | null>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

let activeFetchPromise: Promise<User | null> | null = null;

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  loading: true,
  isAuthenticated: false,

  fetchUser: async (force = false) => {
    // Return cached user if already fetched and not forced
    if (get().user && !force) {
      return get().user;
    }

    if (activeFetchPromise && !force) {
      return activeFetchPromise;
    }

    set({ loading: !get().user });
    activeFetchPromise = (async () => {
      try {
        const res = await api.get("/auth/user");
        const userData = res.data?.user || res.data;
        if (userData && (userData._id || userData.email)) {
          set({ user: userData, isAuthenticated: true, loading: false });
          return userData;
        }
        set({ user: null, isAuthenticated: false, loading: false });
        return null;
      } catch {
        // 401 after a failed refresh, or network error — treat as logged out.
        set({ user: null, isAuthenticated: false, loading: false });
        return null;
      } finally {
        activeFetchPromise = null;
      }
    })();

    return activeFetchPromise;
  },

  logout: async () => {
    try {
      await api.post("/auth/logout", {});
    } catch {
      // Even if the server call fails, drop local state.
    } finally {
      set({ user: null, isAuthenticated: false, loading: false });
      if (typeof window !== "undefined") window.location.href = "/login";
    }
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));
