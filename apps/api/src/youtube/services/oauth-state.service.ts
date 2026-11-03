import { Injectable, Logger } from '@nestjs/common';
import crypto from 'node:crypto';

export interface OAuthStateRecord {
  userId: string;
  operation: string;
  returnPath?: string;
  expiresAt: number;
  createdAt: number;
}

@Injectable()
export class OAuthStateService {
  private readonly logger = new Logger(OAuthStateService.name);
  private readonly stateStore = new Map<string, OAuthStateRecord>();
  private readonly DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes

  constructor() {
    // Periodic sweep every 5 minutes to clean up unconsumed/abandoned states
    const cleanupInterval = setInterval(
      () => {
        this.cleanupExpiredStates();
      },
      5 * 60 * 1000,
    );

    // Unref timer so it does not keep Node.js process alive in tests or shutdown
    if (cleanupInterval.unref) {
      cleanupInterval.unref();
    }
  }

  /**
   * Generates a 256-bit cryptographically secure, unpredictable OAuth state token,
   * binds it to the authenticated user ID and operation, and stores it server-side.
   */
  generateState(
    userId: string,
    operation = 'youtube_connect',
    ttlMs = this.DEFAULT_TTL_MS,
    returnPath = '/settings',
  ): string {
    if (!userId || typeof userId !== 'string') {
      throw new Error(
        'Cannot generate OAuth state without an authenticated user ID.',
      );
    }

    const stateToken = crypto.randomBytes(32).toString('hex');
    const now = Date.now();

    this.stateStore.set(stateToken, {
      userId,
      operation,
      returnPath,
      expiresAt: now + ttlMs,
      createdAt: now,
    });

    return stateToken;
  }

  /**
   * Atomically validates and consumes the OAuth state token.
   * Returns the bound record if valid and not expired, or null otherwise.
   * Deleting on first lookup guarantees single-use semantics and prevents replay attacks.
   */
  consumeState(
    stateToken: string,
    expectedOperation = 'youtube_connect',
  ): OAuthStateRecord | null {
    if (!stateToken || typeof stateToken !== 'string') {
      return null;
    }

    const record = this.stateStore.get(stateToken);
    if (!record) {
      return null; // Token does not exist or was already consumed (replay attempt)
    }

    // Atomically consume state
    this.stateStore.delete(stateToken);

    // Verify expiry
    if (Date.now() > record.expiresAt) {
      this.logger.warn(
        `Rejected expired OAuth state token for user: ${record.userId}`,
      );
      return null;
    }

    // Verify expected operation
    if (record.operation !== expectedOperation) {
      this.logger.warn(
        `OAuth state operation mismatch: expected "${expectedOperation}", got "${record.operation}"`,
      );
      return null;
    }

    return record;
  }

  /**
   * Removes all expired state entries from the in-memory map.
   */
  cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [token, record] of this.stateStore.entries()) {
      if (record.expiresAt < now) {
        this.stateStore.delete(token);
      }
    }
  }

  /**
   * Clears all states (primarily for testing isolation).
   */
  clearAllStates(): void {
    this.stateStore.clear();
  }

  /**
   * Returns current count of stored states (for testing inspection).
   */
  get size(): number {
    return this.stateStore.size;
  }
}
