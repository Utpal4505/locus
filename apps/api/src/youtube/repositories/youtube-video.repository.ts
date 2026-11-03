import { Inject, Injectable } from '@nestjs/common';
import { videos, videoTaggingStates } from '@locus/database';
import { DRIZZLE_DB, type DrizzleDb } from '../../database/index.js';

export interface VideoUpsertPayload {
  youtubeVideoId: string;
  sourceId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  publishedAt: Date | null;
  url: string;
}

@Injectable()
export class YoutubeVideoRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async upsertVideo(
    v: VideoUpsertPayload,
    isAiTaggingEnabled = false,
  ): Promise<string | undefined> {
    const upsertQuery = this.db
      .insert(videos)
      .values({
        youtubeVideoId: v.youtubeVideoId,
        sourceId: v.sourceId,
        title: v.title,
        description: v.description,
        thumbnailUrl: v.thumbnailUrl,
        durationSeconds: v.durationSeconds,
        publishedAt: v.publishedAt,
        url: v.url,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: videos.youtubeVideoId,
        set: {
          sourceId: v.sourceId,
          title: v.title,
          description: v.description,
          thumbnailUrl: v.thumbnailUrl,
          durationSeconds: v.durationSeconds,
          publishedAt: v.publishedAt,
          url: v.url,
          updatedAt: new Date(),
        },
      });

    let insertedId: string | undefined;
    if (upsertQuery && typeof (upsertQuery as any).returning === 'function') {
      const rows = await (upsertQuery as any).returning({ id: videos.id });
      insertedId = rows?.[0]?.id;
    } else {
      await upsertQuery;
    }

    if (insertedId && isAiTaggingEnabled) {
      await this.db
        .insert(videoTaggingStates)
        .values({
          videoId: insertedId,
          status: 'pending',
          attemptCount: 0,
        })
        .onConflictDoNothing();
    }

    return insertedId;
  }
}

