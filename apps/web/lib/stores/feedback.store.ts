import { create } from "zustand";

export interface FeedbackStoreState {
  isOpen: boolean;
  defaultType: "bug" | "feature_request";
  appContext?: Record<string, unknown>;
  open: (
    type?: "bug" | "feature_request",
    appContext?: Record<string, unknown>,
  ) => void;
  close: () => void;
}

export const useFeedbackStore = create<FeedbackStoreState>((set) => ({
  isOpen: false,
  defaultType: "bug",
  appContext: undefined,
  open: (type = "bug", appContext) =>
    set({ isOpen: true, defaultType: type, appContext }),
  close: () => set({ isOpen: false, appContext: undefined }),
}));

