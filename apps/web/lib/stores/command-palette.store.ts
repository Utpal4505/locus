import { create } from "zustand";

export interface CommandPaletteState {
  isOpen: boolean;
  query: string;
  open: (initialQuery?: string) => void;
  close: () => void;
  toggle: () => void;
  setQuery: (query: string) => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  isOpen: false,
  query: "",
  open: (initialQuery = "") => set({ isOpen: true, query: initialQuery }),
  close: () => set({ isOpen: false, query: "" }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen, query: "" })),
  setQuery: (query: string) => set({ query }),
}));

