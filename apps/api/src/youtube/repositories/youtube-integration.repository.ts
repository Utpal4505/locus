import { Inject, Injectable } from '@nestjs/common';
import { and, eq, integrations, type Integration } from '@locus/database';
import { DRIZZLE_DB, type DrizzleDb } from '../../database/index.js';

export type IntegrationStatus =
  | 'connected'
  | 'expired'
  | 'revoked'
  | 'disconnected';

export interface UpsertIntegrationData {
  userId: string;
  externalAccountId: string | null;
  encryptedAccessToken: string;
  encryptedRefreshToken?: string | null;
  tokenExpiresAt: Date | null;
  scopes: string;
  status: IntegrationStatus;
}

export interface RefreshedTokenData {
  encryptedAccessToken: string;
  tokenExpiresAt: Date;
  status: IntegrationStatus;
  encryptedRefreshToken?: string;
  updatedAt: Date;
}

@Injectable()
export class YoutubeIntegrationRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async findByUserId(userId: string): Promise<Integration | null> {
    const [row] = await this.db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, userId),
          eq(integrations.provider, 'youtube'),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  async saveIntegration(
    userId: string,
    data: UpsertIntegrationData,
  ): Promise<Integration> {
    const [saved] = await this.db
      .insert(integrations)
      .values({
        userId,
        provider: 'youtube',
        externalAccountId: data.externalAccountId,
        encryptedAccessToken: data.encryptedAccessToken,
        encryptedRefreshToken: data.encryptedRefreshToken ?? null,
        tokenExpiresAt: data.tokenExpiresAt,
        scopes: data.scopes,
        status: data.status,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [integrations.userId, integrations.provider],
        set: {
          externalAccountId: data.externalAccountId,
          encryptedAccessToken: data.encryptedAccessToken,
          ...(data.encryptedRefreshToken
            ? { encryptedRefreshToken: data.encryptedRefreshToken }
            : {}),
          tokenExpiresAt: data.tokenExpiresAt,
          scopes: data.scopes,
          status: data.status,
          updatedAt: new Date(),
        },
      })
      .returning();

    return saved;
  }

  async updateStatus(
    userId: string,
    status: IntegrationStatus,
  ): Promise<void> {
    await this.db
      .update(integrations)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(integrations.userId, userId),
          eq(integrations.provider, 'youtube'),
        ),
      );
  }

  async updateRefreshedToken(
    userId: string,
    payload: RefreshedTokenData,
  ): Promise<void> {
    const updatePayload: Record<string, unknown> = {
      encryptedAccessToken: payload.encryptedAccessToken,
      tokenExpiresAt: payload.tokenExpiresAt,
      status: payload.status,
      updatedAt: payload.updatedAt,
    };

    if (payload.encryptedRefreshToken) {
      updatePayload.encryptedRefreshToken = payload.encryptedRefreshToken;
    }

    await this.db
      .update(integrations)
      .set(updatePayload)
      .where(
        and(
          eq(integrations.userId, userId),
          eq(integrations.provider, 'youtube'),
        ),
      );
  }

  async findAllConnectedUsers(): Promise<Array<{ userId: string }>> {
    return this.db
      .select({ userId: integrations.userId })
      .from(integrations)
      .where(
        and(
          eq(integrations.provider, 'youtube'),
          eq(integrations.status, 'connected'),
        ),
      );
  }
}

