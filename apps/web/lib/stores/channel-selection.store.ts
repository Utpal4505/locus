"use client";

import { create } from "zustand";

export interface ChannelSelectionState {
  /** Array of currently selected channel IDs (Locus source UUIDs or external IDs) */
  selectedChannelIds: string[];
  /** Toggles selection of an individual channel */
  toggleChannel: (channelId: string) => void;
  /** Sets selection to the provided list of eligible channel IDs */
  selectAll: (channelIds: string[]) => void;
  /** Adds multiple channel IDs to the current selection (union) */
  selectMany: (channelIds: string[]) => void;
  /** Removes multiple channel IDs from the current selection */
  deselectMany: (channelIds: string[]) => void;
  /** Prunes any selections that are not in the valid eligible channel list */
  pruneInvalidSelections: (eligibleChannelIds: string[]) => void;
  /** Clears all selected channels */
  clearSelection: () => void;
  /** Checks if a specific channel is selected */
  isSelected: (channelId: string) => boolean;
}

/**
 * Focused Zustand store for cross-component bulk channel selection.
 * Transient UI state (such as search text, feedback messages, or action pending flags)
 * must remain local with `useState`.
 */
export const useChannelSelectionStore = create<ChannelSelectionState>(
  (set, get) => ({
    selectedChannelIds: [],

    toggleChannel: (channelId: string) => {
      const trimmed = channelId.trim();
      if (!trimmed) return;
      const current = get().selectedChannelIds;
      const exists = current.includes(trimmed);
      set({
        selectedChannelIds: exists
          ? current.filter((id) => id !== trimmed)
          : [...current, trimmed],
      });
    },

    selectAll: (channelIds: string[]) => {
      const validIds = Array.from(
        new Set(channelIds.map((id) => id.trim()).filter(Boolean)),
      );
      set({ selectedChannelIds: validIds });
    },

    selectMany: (channelIds: string[]) => {
      const toAdd = channelIds.map((id) => id.trim()).filter(Boolean);
      if (toAdd.length === 0) return;
      const current = get().selectedChannelIds;
      const merged = Array.from(new Set([...current, ...toAdd]));
      if (merged.length !== current.length) {
        set({ selectedChannelIds: merged });
      }
    },

    deselectMany: (channelIds: string[]) => {
      const toRemove = new Set(
        channelIds.map((id) => id.trim()).filter(Boolean),
      );
      if (toRemove.size === 0) return;
      const current = get().selectedChannelIds;
      const filtered = current.filter((id) => !toRemove.has(id));
      if (filtered.length !== current.length) {
        set({ selectedChannelIds: filtered });
      }
    },

    pruneInvalidSelections: (eligibleChannelIds: string[]) => {
      const eligibleSet = new Set(
        eligibleChannelIds.map((id) => id.trim()).filter(Boolean),
      );
      const current = get().selectedChannelIds;
      const filtered = current.filter((id) => eligibleSet.has(id));
      if (filtered.length !== current.length) {
        set({ selectedChannelIds: filtered });
      }
    },

    clearSelection: () => {
      set({ selectedChannelIds: [] });
    },

    isSelected: (channelId: string) => {
      return get().selectedChannelIds.includes(channelId.trim());
    },
  }),
);

