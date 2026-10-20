import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { useChannelSelectionStore } from "./channel-selection.store.js";

describe("useChannelSelectionStore", () => {
  beforeEach(() => {
    useChannelSelectionStore.getState().clearSelection();
  });

  it("initializes with an empty selectedChannelIds array", () => {
    const state = useChannelSelectionStore.getState();
    assert.deepEqual(state.selectedChannelIds, []);
  });

  it("toggles a channel on and off", () => {
    const { toggleChannel } = useChannelSelectionStore.getState();

    toggleChannel("ch-1");
    assert.deepEqual(useChannelSelectionStore.getState().selectedChannelIds, [
      "ch-1",
    ]);
    assert.equal(useChannelSelectionStore.getState().isSelected("ch-1"), true);
    assert.equal(useChannelSelectionStore.getState().isSelected("ch-2"), false);

    toggleChannel("ch-1");
    assert.deepEqual(useChannelSelectionStore.getState().selectedChannelIds, []);
    assert.equal(useChannelSelectionStore.getState().isSelected("ch-1"), false);
  });

  it("ignores empty or whitespace-only channel IDs on toggle", () => {
    const { toggleChannel } = useChannelSelectionStore.getState();

    toggleChannel("");
    toggleChannel("   ");
    assert.deepEqual(useChannelSelectionStore.getState().selectedChannelIds, []);
  });

  it("selects all eligible channels and deduplicates them", () => {
    const { selectAll } = useChannelSelectionStore.getState();

    selectAll(["ch-1", "ch-2", "ch-1", " ch-3 ", ""]);
    assert.deepEqual(useChannelSelectionStore.getState().selectedChannelIds, [
      "ch-1",
      "ch-2",
      "ch-3",
    ]);
    assert.equal(useChannelSelectionStore.getState().isSelected("ch-1"), true);
    assert.equal(useChannelSelectionStore.getState().isSelected("ch-2"), true);
    assert.equal(useChannelSelectionStore.getState().isSelected("ch-3"), true);
  });

  it("clears selection completely", () => {
    const { selectAll, clearSelection } =
      useChannelSelectionStore.getState();

    selectAll(["ch-1", "ch-2", "ch-3"]);
    assert.equal(
      useChannelSelectionStore.getState().selectedChannelIds.length,
      3,
    );

    clearSelection();
    assert.deepEqual(useChannelSelectionStore.getState().selectedChannelIds, []);
    assert.equal(useChannelSelectionStore.getState().isSelected("ch-1"), false);
  });

  it("selectMany merges additional channels without clearing previous selections", () => {
    const { toggleChannel, selectMany } = useChannelSelectionStore.getState();

    toggleChannel("ch-1");
    selectMany(["ch-2", "ch-3", "ch-1"]);

    assert.deepEqual(useChannelSelectionStore.getState().selectedChannelIds, [
      "ch-1",
      "ch-2",
      "ch-3",
    ]);
  });

  it("deselectMany removes specified channels without clearing other selections", () => {
    const { selectAll, deselectMany } = useChannelSelectionStore.getState();

    selectAll(["ch-1", "ch-2", "ch-3", "ch-4"]);
    deselectMany(["ch-2", "ch-4"]);

    assert.deepEqual(useChannelSelectionStore.getState().selectedChannelIds, [
      "ch-1",
      "ch-3",
    ]);
  });

  it("pruneInvalidSelections removes followed/unavailable channels while keeping valid ones", () => {
    const { selectAll, pruneInvalidSelections } =
      useChannelSelectionStore.getState();

    selectAll(["ch-1", "ch-2", "ch-3"]);
    // Suppose ch-2 became followed and is no longer eligible:
    pruneInvalidSelections(["ch-1", "ch-3", "ch-4"]);

    assert.deepEqual(useChannelSelectionStore.getState().selectedChannelIds, [
      "ch-1",
      "ch-3",
    ]);
  });
});

