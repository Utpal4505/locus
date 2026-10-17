import { describe, expect, it } from "vitest";
import { OAuthStateService } from "./oauth-state.service.js";

describe("OAuthStateService", () => {
  it("generates 64-character hexadecimal cryptographically secure state tokens", () => {
    const service = new OAuthStateService();
    const state = service.generateState("user_123");

    expect(state).toBeDefined();
    expect(state.length).toBe(64);
    expect(/^[0-9a-f]{64}$/.test(state)).toBe(true);
  });

  it("throws when generating state without a user ID", () => {
    const service = new OAuthStateService();
    expect(() => service.generateState("")).toThrow(
      "Cannot generate OAuth state without an authenticated user ID.",
    );
  });

  it("successfully binds state to user ID and operation, and consumes it", () => {
    const service = new OAuthStateService();
    const state = service.generateState("user_456", "youtube_connect");

    const record = service.consumeState(state, "youtube_connect");
    expect(record).toBeDefined();
    expect(record?.userId).toBe("user_456");
    expect(record?.operation).toBe("youtube_connect");
  });

  it("enforces single-use semantics and rejects replay attacks", () => {
    const service = new OAuthStateService();
    const state = service.generateState("user_replay");

    // First consumption succeeds
    const firstAttempt = service.consumeState(state, "youtube_connect");
    expect(firstAttempt).toBeDefined();
    expect(firstAttempt?.userId).toBe("user_replay");

    // Second consumption must fail (replay rejected)
    const secondAttempt = service.consumeState(state, "youtube_connect");
    expect(secondAttempt).toBeNull();
  });

  it("consumes state at most once during concurrent attempts", async () => {
    const service = new OAuthStateService();
    const state = service.generateState("user_concurrent");

    const results = await Promise.all([
      Promise.resolve().then(() => service.consumeState(state, "youtube_connect")),
      Promise.resolve().then(() => service.consumeState(state, "youtube_connect")),
      Promise.resolve().then(() => service.consumeState(state, "youtube_connect")),
    ]);

    const successes = results.filter((r) => r !== null);
    const failures = results.filter((r) => r === null);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(2);
    expect(successes[0]?.userId).toBe("user_concurrent");
  });

  it("rejects non-existent state tokens", () => {
    const service = new OAuthStateService();
    const result = service.consumeState("completely_non_existent_token");
    expect(result).toBeNull();
  });

  it("rejects expired state tokens", () => {
    const service = new OAuthStateService();
    // Negative TTL so it is immediately expired
    const state = service.generateState("user_expired", "youtube_connect", -1000);

    const result = service.consumeState(state, "youtube_connect");
    expect(result).toBeNull();
  });

  it("rejects state when operation does not match", () => {
    const service = new OAuthStateService();
    const state = service.generateState("user_789", "youtube_connect");

    const result = service.consumeState(state, "different_operation");
    expect(result).toBeNull();
  });

  it("cleans up expired states from memory", () => {
    const service = new OAuthStateService();
    service.generateState("user_valid", "youtube_connect", 60000);
    service.generateState("user_expired", "youtube_connect", -1000);

    expect(service.size).toBe(2);
    service.cleanupExpiredStates();
    expect(service.size).toBe(1);
  });
});

