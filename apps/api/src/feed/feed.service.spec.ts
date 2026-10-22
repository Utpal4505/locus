import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { db } from '@locus/database';
import type { User } from '../auth/auth.js';
import {
  decodeFeedCursor,
  encodeFeedCursor,
  FeedService,
} from './feed.service.js';
import { FeedController } from './feed.controller.js';

describe('FeedService & FeedController', () => {
  let service: FeedService;
  let controller: FeedController;

  const mockUser: User = {
    id: 'usr_feed_test',
    email: 'feed@example.com',
    name: 'Feed User',
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    service = new FeedService();
    controller = new FeedController(service);
    vi.restoreAllMocks();
  });

  describe('Cursor Encoding and Decoding', () => {
    const sampleDate = new Date('2026-10-18T12:00:00.000Z');
    const sampleId = '00000000-0000-0000-0000-000000000001';

    it('encodes and decodes a compound cursor accurately', () => {
      const cursor = encodeFeedCursor(sampleDate, sampleId);
      expect(typeof cursor).toBe('string');
      expect(cursor.length).toBeGreaterThan(0);

      const decoded = decodeFeedCursor(cursor);
      expect(decoded.publishedAt.toISOString()).toBe(sampleDate.toISOString());
      expect(decoded.id).toBe(sampleId);
    });

    it('throws BadRequestException with INVALID_CURSOR for non-base64 strings', () => {
      expect(() => decodeFeedCursor('not-base64!!!')).toThrow(
        BadRequestException,
      );
      try {
        decodeFeedCursor('not-base64!!!');
      } catch (err: any) {
        expect(err.response).toMatchObject({
          code: 'INVALID_CURSOR',
        });
      }
    });

    it('throws BadRequestException with INVALID_CURSOR for invalid JSON or missing properties', () => {
      const corruptCursor1 = Buffer.from(
        JSON.stringify({ publishedAt: '2026-10-18T12:00:00Z' }),
      ).toString('base64url');
      expect(() => decodeFeedCursor(corruptCursor1)).toThrow(
        BadRequestException,
      );

      const corruptCursor2 = Buffer.from(
        JSON.stringify({ id: sampleId }),
      ).toString('base64url');
      expect(() => decodeFeedCursor(corruptCursor2)).toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException with INVALID_CURSOR for invalid date strings', () => {
      const corruptCursor = Buffer.from(
        JSON.stringify({ publishedAt: 'invalid-date', id: sampleId }),
      ).toString('base64url');
      expect(() => decodeFeedCursor(corruptCursor)).toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException with INVALID_CURSOR for invalid UUIDs', () => {
      const corruptCursor = Buffer.from(
        JSON.stringify({
          publishedAt: sampleDate.toISOString(),
          id: 'not-a-uuid',
        }),
      ).toString('base64url');
      expect(() => decodeFeedCursor(corruptCursor)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('FeedService.getFeed', () => {
    function setupQueryMock(rows: any[]) {
      const queryMock = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(rows),
      };
      vi.spyOn(db, 'select').mockReturnValue(queryMock as any);
      return queryMock;
    }

    it('returns empty items, nextCursor null, and hasMore false when no videos exist', async () => {
      const queryMock = setupQueryMock([]);

      const result = await service.getFeed(mockUser.id);

      expect(result).toEqual({
        items: [],
        nextCursor: null,
        hasMore: false,
      });
      // Default limit is 20 -> requests 21 to check hasMore
      expect(queryMock.limit).toHaveBeenCalledWith(21);
    });

    it('returns videos with user library state and handles missing library state via left join', async () => {
      const date1 = new Date('2026-10-18T10:00:00.000Z');
      const date2 = new Date('2026-10-17T09:00:00.000Z');

      const mockRows = [
        {
          id: '00000000-0000-0000-0000-000000000001',
          youtubeVideoId: 'yt_vid_1',
          title: 'Video 1',
          description: 'Description 1',
          thumbnailUrl: 'https://thumb/1.jpg',
          url: 'https://www.youtube.com/watch?v=yt_vid_1',
          publishedAt: date1,
          durationSeconds: 300,
          sourceId: '00000000-0000-0000-0000-000000000010',
          channelName: 'Channel Alpha',
          channelThumbnailUrl: 'https://thumb/alpha.jpg',
          isWatched: true,
          isBookmarked: false,
          isInQueue: true,
          progressSeconds: 150,
        },
        {
          id: '00000000-0000-0000-0000-000000000002',
          youtubeVideoId: 'yt_vid_2',
          title: 'Video 2',
          description: null,
          thumbnailUrl: null,
          url: 'https://www.youtube.com/watch?v=yt_vid_2',
          publishedAt: date2,
          durationSeconds: null,
          sourceId: '00000000-0000-0000-0000-000000000020',
          channelName: 'Channel Beta',
          channelThumbnailUrl: null,
          // No video_library row exists for this user
          isWatched: null,
          isBookmarked: null,
          isInQueue: null,
          progressSeconds: null,
        },
      ];

      setupQueryMock(mockRows);

      const result = await service.getFeed(mockUser.id, { limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();

      // First video has library state
      expect(result.items[0]).toEqual({
        id: '00000000-0000-0000-0000-000000000001',
        youtubeVideoId: 'yt_vid_1',
        title: 'Video 1',
        description: 'Description 1',
        thumbnailUrl: 'https://thumb/1.jpg',
        url: 'https://www.youtube.com/watch?v=yt_vid_1',
        videoUrl: 'https://www.youtube.com/watch?v=yt_vid_1',
        publishedAt: date1.toISOString(),
        durationSeconds: 300,
        sourceId: '00000000-0000-0000-0000-000000000010',
        channelName: 'Channel Alpha',
        channelThumbnailUrl: 'https://thumb/alpha.jpg',
        library: {
          isWatched: true,
          isBookmarked: false,
          isInQueue: true,
          progressSeconds: 150,
        },
      });

      // Second video has no library state -> library is null, video is not excluded
      expect(result.items[1].library).toBeNull();
      expect(result.items[1].channelName).toBe('Channel Beta');
    });

    it('correctly computes hasMore and nextCursor when more items exist than the limit', async () => {
      const date1 = new Date('2026-10-18T10:00:00.000Z');
      const date2 = new Date('2026-10-17T09:00:00.000Z');
      const date3 = new Date('2026-10-16T08:00:00.000Z');

      // Query limit 2 -> service asks for 3 rows
      const mockRows = [
        {
          id: '00000000-0000-0000-0000-000000000001',
          youtubeVideoId: 'yt_1',
          title: 'Video 1',
          description: null,
          thumbnailUrl: null,
          url: 'https://youtube.com/watch?v=yt_1',
          publishedAt: date1,
          durationSeconds: 100,
          sourceId: '00000000-0000-0000-0000-000000000010',
          channelName: 'Alpha',
          channelThumbnailUrl: null,
          isWatched: null,
        },
        {
          id: '00000000-0000-0000-0000-000000000002',
          youtubeVideoId: 'yt_2',
          title: 'Video 2',
          description: null,
          thumbnailUrl: null,
          url: 'https://youtube.com/watch?v=yt_2',
          publishedAt: date2,
          durationSeconds: 200,
          sourceId: '00000000-0000-0000-0000-000000000010',
          channelName: 'Alpha',
          channelThumbnailUrl: null,
          isWatched: null,
        },
        {
          // Extra 3rd item indicating there is a next page
          id: '00000000-0000-0000-0000-000000000003',
          youtubeVideoId: 'yt_3',
          title: 'Video 3',
          description: null,
          thumbnailUrl: null,
          url: 'https://youtube.com/watch?v=yt_3',
          publishedAt: date3,
          durationSeconds: 300,
          sourceId: '00000000-0000-0000-0000-000000000010',
          channelName: 'Alpha',
          channelThumbnailUrl: null,
          isWatched: null,
        },
      ];

      setupQueryMock(mockRows);

      const result = await service.getFeed(mockUser.id, { limit: 2 });

      expect(result.items).toHaveLength(2); // Only limit items returned
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeDefined();

      const decoded = decodeFeedCursor(result.nextCursor!);
      // Cursor must point to the 2nd item (last item in page)
      expect(decoded.id).toBe('00000000-0000-0000-0000-000000000002');
      expect(decoded.publishedAt.toISOString()).toBe(date2.toISOString());
    });

    it('paginates deterministically when multiple videos share identical publication timestamps', async () => {
      const sameDate = new Date('2026-10-18T10:00:00.000Z');

      // Two videos published at exact same millisecond, ordered by id DESC
      const videoA = {
        id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        youtubeVideoId: 'yt_A',
        title: 'Video A',
        description: null,
        thumbnailUrl: null,
        url: 'https://youtube.com/watch?v=yt_A',
        publishedAt: sameDate,
        durationSeconds: 100,
        sourceId: '00000000-0000-0000-0000-000000000010',
        channelName: 'Alpha',
        channelThumbnailUrl: null,
        isWatched: null,
      };

      const videoB = {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        youtubeVideoId: 'yt_B',
        title: 'Video B',
        description: null,
        thumbnailUrl: null,
        url: 'https://youtube.com/watch?v=yt_B',
        publishedAt: sameDate,
        durationSeconds: 120,
        sourceId: '00000000-0000-0000-0000-000000000010',
        channelName: 'Alpha',
        channelThumbnailUrl: null,
        isWatched: null,
      };

      // Page 1: returns videoA and sees videoB as next item
      setupQueryMock([videoA, videoB]);

      const page1 = await service.getFeed(mockUser.id, { limit: 1 });
      expect(page1.items).toHaveLength(1);
      expect(page1.items[0].id).toBe(videoA.id);
      expect(page1.hasMore).toBe(true);

      const cursorForPage2 = page1.nextCursor!;
      const decodedCursor = decodeFeedCursor(cursorForPage2);
      expect(decodedCursor.id).toBe(videoA.id);
      expect(decodedCursor.publishedAt.toISOString()).toBe(
        sameDate.toISOString(),
      );

      // Page 2: with cursor of videoA, returns videoB
      setupQueryMock([videoB]);

      const page2 = await service.getFeed(mockUser.id, {
        limit: 1,
        cursor: cursorForPage2,
      });

      expect(page2.items).toHaveLength(1);
      expect(page2.items[0].id).toBe(videoB.id);
      expect(page2.hasMore).toBe(false);
      expect(page2.nextCursor).toBeNull();
    });
  });

  describe('FeedController', () => {
    it('successfully delegates getFeed for authenticated user with default limit', async () => {
      const spy = vi.spyOn(service, 'getFeed').mockResolvedValueOnce({
        items: [],
        nextCursor: null,
        hasMore: false,
      });

      const res = await controller.getFeed(mockUser, undefined, undefined);

      expect(spy).toHaveBeenCalledWith(mockUser.id, {
        limit: 20,
        cursor: undefined,
        status: undefined,
      });
      expect(res).toEqual({
        items: [],
        nextCursor: null,
        hasMore: false,
      });
    });

    it('parses valid limit, passes cursor, and passes status filter', async () => {
      const spy = vi.spyOn(service, 'getFeed').mockResolvedValueOnce({
        items: [],
        nextCursor: null,
        hasMore: false,
      });

      await controller.getFeed(mockUser, '35', 'valid_cursor_string', 'unwatched');

      expect(spy).toHaveBeenCalledWith(mockUser.id, {
        limit: 35,
        cursor: 'valid_cursor_string',
        status: 'unwatched',
      });
    });

    it('throws BadRequestException for invalid status filter values', async () => {
      await expect(
        controller.getFeed(mockUser, undefined, undefined, 'unknown_status'),
      ).rejects.toMatchObject({
        response: {
          code: 'VALIDATION_ERROR',
        },
        status: 400,
      });
    });

    it('throws BadRequestException with VALIDATION_ERROR for invalid limit values', async () => {
      const invalidLimits = ['0', '-5', '51', '100', 'not-a-number', '12.5'];

      for (const limitStr of invalidLimits) {
        await expect(
          controller.getFeed(mockUser, limitStr, undefined),
        ).rejects.toMatchObject({
          response: {
            code: 'VALIDATION_ERROR',
          },
          status: 400,
        });
      }
    });
  });
});
