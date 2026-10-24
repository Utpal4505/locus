import { create } from "zustand";

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PwaState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isInstallable: boolean;
  isInstalled: boolean;
  isIos: boolean;
  isOnline: boolean;
  isBannerDismissed: boolean;
  setDeferredPrompt: (prompt: BeforeInstallPromptEvent | null) => void;
  setIsInstalled: (installed: boolean) => void;
  setIsIos: (isIos: boolean) => void;
  setIsOnline: (online: boolean) => void;
  dismissBanner: () => void;
  triggerInstall: () => Promise<boolean>;
}

export const usePwaStore = create<PwaState>((set, get) => ({
  deferredPrompt: null,
  isInstallable: false,
  isInstalled: false,
  isIos: false,
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  isBannerDismissed: false,

  setDeferredPrompt: (prompt) =>
    set({
      deferredPrompt: prompt,
      isInstallable: !!prompt,
    }),

  setIsInstalled: (installed) => set({ isInstalled: installed }),
  setIsIos: (isIos) => set({ isIos }),
  setIsOnline: (online) => set({ isOnline: online }),

  dismissBanner: () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("locus_pwa_banner_dismissed", "true");
      } catch (e) {
        // Ignore storage errors in private browsing
      }
    }
    set({ isBannerDismissed: true });
  },

  triggerInstall: async () => {
    const { deferredPrompt } = get();
    if (!deferredPrompt) {
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        set({ deferredPrompt: null, isInstallable: false, isInstalled: true });
        return true;
      }
      return false;
    } catch (err) {
      console.error("[PWA] Error triggering install prompt:", err);
      return false;
    }
  },
}));

