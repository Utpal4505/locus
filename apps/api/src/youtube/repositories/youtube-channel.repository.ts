import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  eq,
  ilike,
  inArray,
  integrations,
  or,
  sources,
  sourceSubscriptions,
  sql,
  userPreferences,
} from '@locus/database';
import { DRIZZLE_DB, type DrizzleDb } from '../../database/index.js';

export interface SourceRecord {
  id: string;
  externalId: string | null;
  type: string;
  name: string;
  url: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  lastFetchedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertSourceItem {
  externalId: string;
  type: 'youtube_channel' | 'news_publisher';
  name: string;
  url: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  updatedAt: Date;
}

export interface ChannelSourcePayload {
  externalId: string;
  name: string;
  url: string;
  description: string | null;
  imageUrl: string | null;
  feedUrl: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class YoutubeChannelRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async findUserIntegration(userId: string) {
    const [integration] = await this.db
      .select({
        status: integrations.status,
        encryptedAccessToken: integrations.encryptedAccessToken,
      })
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, userId),
          eq(integrations.provider, 'youtube'),
        ),
      )
      .limit(1);

    return integration ?? null;
  }

  async upsertSources(sourceList: UpsertSourceItem[]): Promise<SourceRecord[]> {
    if (sourceList.length === 0) return [];

    const results: SourceRecord[] = [];
    for (let i = 0; i < sourceList.length; i += 50) {
      const chunk = sourceList.slice(i, i + 50);
      const inserted = await this.db
        .insert(sources)
        .values(chunk)
        .onConflictDoUpdate({
          target: sources.externalId,
          set: {
            name: sql`EXCLUDED.name`,
            description: sql`EXCLUDED.description`,
            imageUrl: sql`EXCLUDED.image_url`,
            updatedAt: sql`EXCLUDED.updated_at`,
          },
        })
        .returning();

      results.push(...inserted);
    }

    return results;
  }

  async upsertYoutubeChannels(channels: ChannelSourcePayload[]): Promise<void> {
    for (const ch of channels) {
      await this.db
        .insert(sources)
        .values({
          type: 'youtube_channel',
          externalId: ch.externalId,
          name: ch.name,
          url: ch.url,
          description: ch.description,
          imageUrl: ch.imageUrl,
          feedUrl: ch.feedUrl,
          isActive: true,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [sources.type, sources.externalId],
          targetWhere: sql`${sources.externalId} IS NOT NULL`,
          set: {
            name: ch.name,
            url: ch.url,
            description: ch.description,
            imageUrl: ch.imageUrl,
            feedUrl: ch.feedUrl,
            updatedAt: new Date(),
          },
        });
    }
  }

  async findSourceByExternalId(externalId: string): Promise<SourceRecord | null> {
    const [source] = await this.db
      .select()
      .from(sources)
      .where(eq(sources.externalId, externalId))
      .limit(1);

    return source ?? null;
  }

  async findSourceById(sourceId: string): Promise<SourceRecord | null> {
    const [source] = await this.db
      .select()
      .from(sources)
      .where(eq(sources.id, sourceId))
      .limit(1);

    return source ?? null;
  }

  async findFollowedChannels(userId: string): Promise<
    Array<{
      id: string;
      externalId: string | null;
      name: string;
      imageUrl: string | null;
      lastFetchedAt: Date | null;
    }>
  > {
    return this.db
      .select({
        id: sources.id,
        externalId: sources.externalId,
        name: sources.name,
        imageUrl: sources.imageUrl,
        lastFetchedAt: sources.lastFetchedAt,
      })
      .from(sources)
      .innerJoin(
        sourceSubscriptions,
        and(
          eq(sources.id, sourceSubscriptions.sourceId),
          eq(sourceSubscriptions.userId, userId),
        ),
      )
      .where(eq(sources.isActive, true));
  }

  async findFollowedChannelsForSync(userId: string): Promise<
    Array<{
      id: string;
      externalId: string | null;
      name: string;
    }>
  > {
    return this.db
      .select({
        id: sources.id,
        externalId: sources.externalId,
        name: sources.name,
      })
      .from(sourceSubscriptions)
      .innerJoin(sources, eq(sourceSubscriptions.sourceId, sources.id))
      .where(
        and(
          eq(sourceSubscriptions.userId, userId),
          eq(sources.type, 'youtube_channel'),
          eq(sources.isActive, true),
        ),
      );
  }

  async findUserSubscription(userId: string, sourceId: string) {
    const [sub] = await this.db
      .select()
      .from(sourceSubscriptions)
      .where(
        and(
          eq(sourceSubscriptions.userId, userId),
          eq(sourceSubscriptions.sourceId, sourceId),
        ),
      )
      .limit(1);

    return sub ?? null;
  }

  async followChannel(userId: string, sourceId: string): Promise<boolean> {
    await this.db
      .insert(sourceSubscriptions)
      .values({
        userId,
        sourceId,
      })
      .onConflictDoNothing();

    return true;
  }

  async unfollowChannel(userId: string, sourceId: string): Promise<boolean> {
    await this.db
      .delete(sourceSubscriptions)
      .where(
        and(
          eq(sourceSubscriptions.userId, userId),
          eq(sourceSubscriptions.sourceId, sourceId),
        ),
      );

    return true;
  }

  async bulkFollowChannels(userId: string, sourceIds: string[]): Promise<number> {
    if (sourceIds.length === 0) return 0;

    let followedCount = 0;
    for (const sourceId of sourceIds) {
      const res = await this.db
        .insert(sourceSubscriptions)
        .values({
          userId,
          sourceId,
        })
        .onConflictDoNothing()
        .returning({ sourceId: sourceSubscriptions.sourceId });

      if (res && res.length > 0) {
        followedCount++;
      }
    }

    return followedCount;
  }

  async findFollowedSourceIds(userId: string, sourceIds: string[]): Promise<string[]> {
    if (sourceIds.length === 0) return [];

    const rows = await this.db
      .select({ sourceId: sourceSubscriptions.sourceId })
      .from(sourceSubscriptions)
      .where(
        and(
          eq(sourceSubscriptions.userId, userId),
          inArray(sourceSubscriptions.sourceId, sourceIds),
        ),
      );

    return rows.map((r) => r.sourceId);
  }

  async findSourcesByExternalIds(externalIds: string[]): Promise<SourceRecord[]> {
    if (externalIds.length === 0) return [];

    return this.db
      .select()
      .from(sources)
      .where(inArray(sources.externalId, externalIds));
  }

  async updateLastFetchedAt(sourceId: string, timestamp: Date): Promise<void> {
    await this.db
      .update(sources)
      .set({ lastFetchedAt: timestamp, updatedAt: new Date() })
      .where(eq(sources.id, sourceId));
  }

  async getImportedChannelIds(userId: string): Promise<string[]> {
    const [existingPrefs] = await this.db
      .select({ feedPreferences: userPreferences.feedPreferences })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    const feedPrefs = existingPrefs?.feedPreferences as Record<string, unknown> | undefined;
    return Array.isArray(feedPrefs?.importedChannelIds)
      ? (feedPrefs.importedChannelIds as string[])
      : [];
  }

  async addImportedChannelIds(
    userId: string,
    channelExternalIds: string[],
  ): Promise<string[]> {
    const [existingPrefs] = await this.db
      .select({ feedPreferences: userPreferences.feedPreferences })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    const currentFeedPrefs =
      (existingPrefs?.feedPreferences as Record<string, unknown>) || {};
    const currentImportedIds = Array.isArray(currentFeedPrefs.importedChannelIds)
      ? (currentFeedPrefs.importedChannelIds as string[])
      : [];

    const merged = Array.from(
      new Set([...currentImportedIds, ...channelExternalIds]),
    );

    await this.db
      .insert(userPreferences)
      .values({
        userId,
        feedPreferences: {
          ...currentFeedPrefs,
          importedChannelIds: merged,
        },
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          feedPreferences: {
            ...currentFeedPrefs,
            importedChannelIds: merged,
          },
          updatedAt: new Date(),
        },
      });

    return merged;
  }

  async listImportedChannels(
    userId: string,
    importedIds: string[],
  ): Promise<
    Array<{
      id: string;
      externalId: string | null;
      name: string;
      url: string;
      description: string | null;
      thumbnailUrl: string | null;
      isFollowed: boolean;
    }>
  > {
    if (importedIds.length === 0) return [];

    const rows = await this.db
      .select({
        id: sources.id,
        externalId: sources.externalId,
        name: sources.name,
        url: sources.url,
        description: sources.description,
        thumbnailUrl: sources.imageUrl,
        isFollowed:
          sql<boolean>`${sourceSubscriptions.sourceId} IS NOT NULL`.as(
            'is_followed',
          ),
      })
      .from(sources)
      .leftJoin(
        sourceSubscriptions,
        and(
          eq(sourceSubscriptions.sourceId, sources.id),
          eq(sourceSubscriptions.userId, userId),
        ),
      )
      .where(
        and(
          eq(sources.type, 'youtube_channel'),
          eq(sources.isActive, true),
          or(
            inArray(sources.externalId, importedIds),
            sql`${sourceSubscriptions.sourceId} IS NOT NULL`,
          ),
        ),
      )
      .orderBy(asc(sources.name));

    return rows.map((r) => ({
      ...r,
      isFollowed: Boolean(r.isFollowed),
    }));
  }

  async searchChannels(
    userId: string,
    parsed: { type: 'channel_id' | 'handle' | 'keyword'; value: string },
    discoveredExternalIds: string[],
  ): Promise<
    Array<{
      id: string;
      externalId: string | null;
      name: string;
      url: string;
      description: string | null;
      thumbnailUrl: string | null;
      isFollowed: boolean;
    }>
  > {
    const localConditions = [
      eq(sources.type, 'youtube_channel'),
      eq(sources.isActive, true),
    ];

    if (parsed.type === 'channel_id') {
      localConditions.push(eq(sources.externalId, parsed.value));
    } else {
      localConditions.push(
        or(
          ilike(sources.name, `%${parsed.value}%`),
          ilike(sources.url, `%${parsed.value}%`),
          ...(discoveredExternalIds.length > 0
            ? [inArray(sources.externalId, discoveredExternalIds)]
            : []),
        )!,
      );
    }

    const rows = await this.db
      .select({
        id: sources.id,
        externalId: sources.externalId,
        name: sources.name,
        url: sources.url,
        description: sources.description,
        thumbnailUrl: sources.imageUrl,
        isFollowed:
          sql<boolean>`${sourceSubscriptions.sourceId} IS NOT NULL`.as(
            'is_followed',
          ),
      })
      .from(sources)
      .leftJoin(
        sourceSubscriptions,
        and(
          eq(sourceSubscriptions.sourceId, sources.id),
          eq(sourceSubscriptions.userId, userId),
        ),
      )
      .where(and(...localConditions))
      .limit(15);

    return rows.map((r) => ({
      ...r,
      isFollowed: Boolean(r.isFollowed),
    }));
  }

  async findChannelByIdentifier(identifier: string): Promise<SourceRecord | null> {
    const trimmed = identifier.trim();
    const isUuid = UUID_REGEX.test(trimmed);

    const [channel] = await this.db
      .select()
      .from(sources)
      .where(
        and(
          eq(sources.type, 'youtube_channel'),
          isUuid ? eq(sources.id, trimmed) : eq(sources.externalId, trimmed),
        ),
      )
      .limit(1);

    return channel ?? null;
  }

  async findChannelsByIdentifiers(
    uuids: string[],
    externalIds: string[],
  ): Promise<SourceRecord[]> {
    const idConditions = [];
    if (uuids.length > 0) {
      idConditions.push(inArray(sources.id, uuids));
    }
    if (externalIds.length > 0) {
      idConditions.push(inArray(sources.externalId, externalIds));
    }
    if (idConditions.length === 0) return [];

    return this.db
      .select()
      .from(sources)
      .where(
        and(
          eq(sources.type, 'youtube_channel'),
          eq(sources.isActive, true),
          or(...idConditions),
        ),
      );
  }

  async insertSubscriptions(userId: string, sourceIds: string[]): Promise<void> {
    if (sourceIds.length === 0) return;

    const executeInsert = async (executor: any) => {
      await executor
        .insert(sourceSubscriptions)
        .values(
          sourceIds.map((sourceId) => ({
            userId,
            sourceId,
          })),
        )
        .onConflictDoNothing();
    };

    if (typeof this.db.transaction === 'function') {
      await this.db.transaction(async (tx: any) => {
        await executeInsert(tx);
      });
    } else {
      await executeInsert(this.db);
    }
  }
}
