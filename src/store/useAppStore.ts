import { create } from "zustand";
import { Event, Organizer } from "../types";

interface AppState {
  // Navigation
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activePolicyTab: string;
  setActivePolicyTab: (tab: string) => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  cookiePreferencesOpen: boolean;
  setCookiePreferencesOpen: (open: boolean) => void;

  // Global Auth/Org
  token: string;
  setToken: (token: string) => void;
  organizer: Organizer | null;
  setOrganizer: (org: Organizer | null) => void;

  // Global Data
  events: Event[];
  setEvents: (events: Event[]) => void;
  walletOverview: any;
  setWalletOverview: (data: any) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;

  // Toast
  toast: { message: string; type: "success" | "error" } | null;
  showToast: (message: string, type: "success" | "error") => void;

  // Fetch Data
  fetchData: () => Promise<void>;
  checkAuth: () => Promise<void>;
  logout: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  activeTab: "public",
  setActiveTab: (tab) => set({ activeTab: tab }),
  activePolicyTab: "refund",
  setActivePolicyTab: (tab) => set({ activePolicyTab: tab }),
  mobileSidebarOpen: false,
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  cookiePreferencesOpen: false,
  setCookiePreferencesOpen: (open) => set({ cookiePreferencesOpen: open }),

  token: "",
  setToken: (token) => set({ token }),
  organizer: null,
  setOrganizer: (organizer) => set({ organizer }),

  events: [],
  setEvents: (events) => set({ events }),
  walletOverview: null,
  setWalletOverview: (walletOverview) => set({ walletOverview }),
  loading: false,
  setLoading: (loading) => set({ loading }),

  toast: null,
  showToast: (message, type) => {
    set({ toast: { message, type } });
    setTimeout(() => {
      set((state) => (state.toast?.message === message ? { toast: null } : state));
    }, 4000);
  },

  fetchData: async () => {
    const { token } = get();
    set({ loading: true });
    try {
      const eventsRes = await fetch("/api/events");
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        set({ events: eventsData });
      }

      if (token) {
        const orgRes = await fetch("/api/organizers/me", { credentials: "include" });
        if (orgRes.ok) {
          const orgData = await orgRes.json();
          set({ organizer: orgData });
        } else {
          set({ organizer: null });
        }

        const walletRes = await fetch("/api/wallet/overview", { credentials: "include" });
        if (walletRes.ok) {
          const walletData = await walletRes.json();
          set({ walletOverview: walletData });
        }
      }
    } catch (e) {
      console.error("Error fetching state data", e);
    } finally {
      set({ loading: false });
    }
  },

  checkAuth: async () => {
    try {
      const orgRes = await fetch("/api/organizers/me", { credentials: "include" });
      if (!orgRes.ok) {
        set({ token: "", organizer: null });
      }
    } catch {
      set({ token: "", organizer: null });
    }
  },

  logout: () => {
    set({ token: "", organizer: null });
  }
}));
