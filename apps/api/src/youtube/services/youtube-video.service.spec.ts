import crypto from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encryptToken } from '../../common/crypto/index.js';
import type { User } from '../../auth/auth.js';
import {
  parseIsoDuration,
  YoutubeVideoService,
} from './youtube-video.service.js';
import { YoutubeController } from '../controllers/youtube.controller.js';
import type { YoutubeChannelRepository } from '../repositories/youtube-channel.repository.js';
import type { YoutubeVideoRepository } from '../repositories/youtube-video.repository.js';
import type { YoutubeIntegrationRepository } from '../repositories/youtube-integration.repository.js';

const TEST_KEY = crypto.randomBytes(32).toString('hex');

describe('YoutubeVideoService & Video Sync Controller', () => {
  let service: YoutubeVideoService;
  let controller: YoutubeController;
  let mockChannelRepo: Record<keyof YoutubeChannelRepository, any>;
  let mockVideoRepo: Record<keyof YoutubeVideoRepository, any>;
  let mockIntegrationRepo: Record<keyof YoutubeIntegrationRepository, any>;

  const originalEnv = { ...process.env };

  const mockUser: User = {
    id: 'usr_sync_user',
    email: 'sync@example.com',
    name: 'Sync User',
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      TOKEN_ENCRYPTION_KEY: TEST_KEY,
    };

    mockChannelRepo = {
      findUserIntegration: vi.fn(),
      upsertSources: vi.fn(),
      upsertYoutubeChannels: vi.fn(),
      findSourceByExternalId: vi.fn(),
      findSourceById: vi.fn(),
      findFollowedChannels: vi.fn(),
      findFollowedChannelsForSync: vi.fn().mockResolvedValue([]),
      findUserSubscription: vi.fn(),
      followChannel: vi.fn(),
      unfollowChannel: vi.fn(),
      bulkFollowChannels: vi.fn(),
      findFollowedSourceIds: vi.fn(),
      findSourcesByExternalIds: vi.fn(),
      updateLastFetchedAt: vi.fn().mockResolvedValue(undefined),
      getImportedChannelIds: vi.fn(),
      addImportedChannelIds: vi.fn(),
      listImportedChannels: vi.fn(),
      searchChannels: vi.fn(),
      findChannelByIdentifier: vi.fn(),
      findChannelsByIdentifiers: vi.fn(),
      insertSubscriptions: vi.fn(),
    };

    mockVideoRepo = {
      upsertVideo: vi.fn().mockResolvedValue('inserted-video-id'),
    };

    mockIntegrationRepo = {
      findByUserId: vi.fn(),
      saveIntegration: vi.fn(),
      updateStatus: vi.fn(),
      updateRefreshedToken: vi.fn(),
      findAllConnectedUsers: vi.fn(),
    };

    service = new YoutubeVideoService(
      mockChannelRepo as unknown as YoutubeChannelRepository,
      mockVideoRepo as unknown as YoutubeVideoRepository,
      mockIntegrationRepo as unknown as YoutubeIntegrationRepository,
    );

    controller = new YoutubeController(
      {} as any,
      {} as any,
      {} as any,
      service,
    );

    vi.restoreAllMocks();
  });

  describe('parseIsoDuration', () => {
    it('correctly parses standard hours, minutes, and seconds', () => {
      expect(parseIsoDuration('PT15M33S')).toBe(933);
      expect(parseIsoDuration('PT1H2M10S')).toBe(3730);
      expect(parseIsoDuration('PT1H')).toBe(3600);
      expect(parseIsoDuration('PT45S')).toBe(45);
      expect(parseIsoDuration('PT0S')).toBe(0);
    });

    it('correctly parses days and weeks', () => {
      expect(parseIsoDuration('P1D')).toBe(86400);
      expect(parseIsoDuration('P1DT2H3M4S')).toBe(93784);
      expect(parseIsoDuration('P1W')).toBe(604800);
    });

    it('returns null for invalid or null inputs', () => {
      expect(parseIsoDuration(null)).toBeNull();
      expect(parseIsoDuration(undefined)).toBeNull();
      expect(parseIsoDuration('')).toBeNull();
      expect(parseIsoDuration('invalid-duration')).toBeNull();
    });
  });

  describe('syncFollowedChannelVideos error and edge conditions', () => {
    it('throws BadRequestException with YOUTUBE_NOT_CONNECTED if user has no YouTube integration', async () => {
      mockIntegrationRepo.findByUserId.mockResolvedValueOnce(null);

      await expect(
        service.syncFollowedChannelVideos('usr_sync_user'),
      ).rejects.toMatchObject({
        response: {
          code: 'YOUTUBE_NOT_CONNECTED',
        },
        status: 400,
      });
    });

    it('throws UnauthorizedException with YOUTUBE_REAUTH_REQUIRED if token decryption fails', async () => {
      mockIntegrationRepo.findByUserId.mockResolvedValueOnce({
        status: 'connected',
        encryptedAccessToken: 'invalid_encrypted_data',
      });

      await expect(
        service.syncFollowedChannelVideos('usr_sync_user'),
      ).rejects.toMatchObject({
        response: {
          code: 'YOUTUBE_REAUTH_REQUIRED',
        },
        status: 401,
      });
    });

    it('returns empty summary immediately if user has no followed YouTube channels', async () => {
      const validToken = encryptToken('ya29.valid_token');
      mockIntegrationRepo.findByUserId.mockResolvedValueOnce({
        status: 'connected',
        encryptedAccessToken: validToken,
      });
      mockChannelRepo.findFollowedChannelsForSync.mockResolvedValueOnce([]);

      const result = await service.syncFollowedChannelVideos('usr_sync_user');
      expect(result).toEqual({
        channelsProcessed: 0,
        videosSynced: 0,
        itemsSkipped: 0,
        limitReached: false,
      });
    });

    it('throws UnauthorizedException with YOUTUBE_REAUTH_REQUIRED if YouTube API returns 401', async () => {
      const validToken = encryptToken('ya29.valid_token');
      mockIntegrationRepo.findByUserId.mockResolvedValueOnce({
        status: 'connected',
        encryptedAccessToken: validToken,
      });
      mockChannelRepo.findFollowedChannelsForSync.mockResolvedValueOnce([
        {
          id: '00000000-0000-0000-0000-000000000001',
          externalId: 'UC_channel_1',
          name: 'Channel One',
        },
      ]);

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        status: 401,
        ok: false,
      } as Response);

      await expect(
        service.syncFollowedChannelVideos('usr_sync_user'),
      ).rejects.toMatchObject({
        response: {
          code: 'YOUTUBE_REAUTH_REQUIRED',
        },
        status: 401,
      });
    });

    it('throws 429 HttpException with YOUTUBE_API_ERROR if YouTube API quota is exceeded', async () => {
      const validToken = encryptToken('ya29.valid_token');
      mockIntegrationRepo.findByUserId.mockResolvedValueOnce({
        status: 'connected',
        encryptedAccessToken: validToken,
      });
      mockChannelRepo.findFollowedChannelsForSync.mockResolvedValueOnce([
        {
          id: '00000000-0000-0000-0000-000000000001',
          externalId: 'UC_channel_1',
          name: 'Channel One',
        },
      ]);

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        status: 403,
        ok: false,
        json: async () => ({
          error: {
            errors: [{ reason: 'quotaExceeded' }],
          },
        }),
      } as Response);

      await expect(
        service.syncFollowedChannelVideos('usr_sync_user'),
      ).rejects.toMatchObject({
        response: {
          code: 'YOUTUBE_API_ERROR',
        },
        status: 429,
      });
    });
  });

  describe('successful video ingestion, enrichment, ordering, and upserting', () => {
    it('resolves uploads playlist, fetches playlistItems, enriches with videos.list, orders by publishedAt, and upserts into videos without creating video_library state', async () => {
      const validToken = encryptToken('ya29.valid_token');
      mockIntegrationRepo.findByUserId.mockResolvedValueOnce({
        status: 'connected',
        encryptedAccessToken: validToken,
      });
      mockChannelRepo.findFollowedChannelsForSync.mockResolvedValueOnce([
        {
          id: '00000000-0000-0000-0000-000000000001',
          externalId: 'UC_chan_alpha',
          name: 'Channel Alpha',
        },
      ]);

      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      // channels.list response
      fetchSpy.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'UC_chan_alpha',
              contentDetails: {
                relatedPlaylists: {
                  uploads: 'UU_chan_alpha',
                },
              },
            },
          ],
        }),
      } as Response);

      // playlistItems.list response (contains an older video, a newer video, and an invalid item)
      fetchSpy.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          items: [
            {
              snippet: {
                title: 'Older Video',
                description: 'Older description',
                publishedAt: '2026-10-01T10:00:00Z',
                thumbnails: { high: { url: 'https://thumb/older.jpg' } },
                resourceId: { videoId: 'vid_older' },
              },
              contentDetails: {
                videoId: 'vid_older',
                videoPublishedAt: '2026-10-01T10:00:00Z',
              },
            },
            {
              // Deleted / Private video item to skip
              snippet: {
                title: 'Deleted video',
                resourceId: { videoId: 'vid_deleted' },
              },
            },
            {
              snippet: {
                title: 'Newer Video',
                description: 'Newer description',
                publishedAt: '2026-10-15T15:00:00Z',
                thumbnails: { high: { url: 'https://thumb/newer.jpg' } },
                resourceId: { videoId: 'vid_newer' },
              },
              contentDetails: {
                videoId: 'vid_newer',
                videoPublishedAt: '2026-10-15T15:00:00Z',
              },
            },
          ],
        }),
      } as Response);

      // videos.list response (duration and high-res thumbnails)
      fetchSpy.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'vid_older',
              snippet: {
                title: 'Older Video (Enriched)',
                description: 'Older description',
                publishedAt: '2026-10-01T10:00:00Z',
                thumbnails: {
                  maxres: { url: 'https://thumb/older-maxres.jpg' },
                },
              },
              contentDetails: {
                duration: 'PT10M15S', // 615 seconds
              },
            },
            {
              id: 'vid_newer',
              snippet: {
                title: 'Newer Video (Enriched)',
                description: 'Newer description',
                publishedAt: '2026-10-15T15:00:00Z',
                thumbnails: {
                  maxres: { url: 'https://thumb/newer-maxres.jpg' },
                },
              },
              contentDetails: {
                duration: 'PT1H5M', // 3900 seconds
              },
            },
          ],
        }),
      } as Response);

      const result = await service.syncFollowedChannelVideos('usr_sync_user');

      expect(result).toEqual({
        channelsProcessed: 1,
        videosSynced: 2,
        itemsSkipped: 1, // Deleted video was skipped
        limitReached: false,
      });

      // Verify videos were inserted in publication timestamp descending order (newer first)
      expect(mockVideoRepo.upsertVideo).toHaveBeenCalledTimes(2);
      const firstCallArgs = mockVideoRepo.upsertVideo.mock.calls[0][0];
      const secondCallArgs = mockVideoRepo.upsertVideo.mock.calls[1][0];

      expect(firstCallArgs.youtubeVideoId).toBe('vid_newer');
      expect(firstCallArgs.title).toBe('Newer Video (Enriched)');
      expect(firstCallArgs.durationSeconds).toBe(3900);
      expect(firstCallArgs.thumbnailUrl).toBe('https://thumb/newer-maxres.jpg');
      expect(firstCallArgs.url).toBe('https://www.youtube.com/watch?v=vid_newer');

      expect(secondCallArgs.youtubeVideoId).toBe('vid_older');
      expect(secondCallArgs.title).toBe('Older Video (Enriched)');
      expect(secondCallArgs.durationSeconds).toBe(615);
      expect(secondCallArgs.thumbnailUrl).toBe('https://thumb/older-maxres.jpg');

      expect(mockChannelRepo.updateLastFetchedAt).toHaveBeenCalledWith(
        '00000000-0000-0000-0000-000000000001',
        expect.any(Date),
      );
    });

    it('handles multiple channels, detects limit reached, and isolates partial channel failure', async () => {
      const validToken = encryptToken('ya29.valid_token');
      mockIntegrationRepo.findByUserId.mockResolvedValueOnce({
        status: 'connected',
        encryptedAccessToken: validToken,
      });
      mockChannelRepo.findFollowedChannelsForSync.mockResolvedValueOnce([
        {
          id: '00000000-0000-0000-0000-000000000001',
          externalId: 'UC_chan_ok',
          name: 'Channel OK',
        },
        {
          id: '00000000-0000-0000-0000-000000000002',
          externalId: 'UC_chan_fail',
          name: 'Channel Broken',
        },
      ]);

      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      // channels.list (returns upload playlist for UC_chan_ok, relies on UU fallback for UC_chan_fail)
      fetchSpy.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'UC_chan_ok',
              contentDetails: {
                relatedPlaylists: {
                  uploads: 'UU_chan_ok',
                },
              },
            },
          ],
        }),
      } as Response);

      // playlistItems.list for Channel OK: returns 2 items and a nextPageToken
      fetchSpy.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          nextPageToken: 'next_page_token_exists',
          items: [
            {
              snippet: {
                title: 'Channel OK Video 1',
                publishedAt: '2026-10-16T12:00:00Z',
                resourceId: { videoId: 'vid_ok_1' },
              },
            },
            {
              snippet: {
                title: 'Channel OK Video 2',
                publishedAt: '2026-10-15T12:00:00Z',
                resourceId: { videoId: 'vid_ok_2' },
              },
            },
          ],
        }),
      } as Response);

      // videos.list for Channel OK
      fetchSpy.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'vid_ok_1',
              snippet: {
                title: 'Channel OK Video 1',
                publishedAt: '2026-10-16T12:00:00Z',
              },
              contentDetails: { duration: 'PT5M' },
            },
            {
              id: 'vid_ok_2',
              snippet: {
                title: 'Channel OK Video 2',
                publishedAt: '2026-10-15T12:00:00Z',
              },
              contentDetails: { duration: 'PT8M' },
            },
          ],
        }),
      } as Response);

      // playlistItems.list for Channel Broken: returns 404 (e.g. playlist removed on YouTube)
      fetchSpy.mockResolvedValueOnce({
        status: 404,
        ok: false,
      } as Response);

      const result = await service.syncFollowedChannelVideos('usr_sync_user', {
        maxResultsPerChannel: 2,
      });

      expect(result.channelsProcessed).toBe(1); // 1 succeeded, 1 skipped/failed
      expect(result.videosSynced).toBe(2);
      expect(result.limitReached).toBe(true); // Hit limit of 2 with nextPageToken present
    });
  });

  describe('YoutubeController syncVideos delegation', () => {
    it('delegates syncVideos from query parameter and body to service', async () => {
      const spy = vi
        .spyOn(service, 'syncFollowedChannelVideos')
        .mockResolvedValueOnce({
          channelsProcessed: 2,
          videosSynced: 10,
          itemsSkipped: 0,
          limitReached: false,
        });

      const res = await controller.syncVideos(mockUser, '25', undefined);
      expect(spy).toHaveBeenCalledWith(mockUser.id, {
        maxResultsPerChannel: 25,
      });
      expect(res).toEqual({
        channelsProcessed: 2,
        videosSynced: 10,
        itemsSkipped: 0,
        limitReached: false,
      });
    });
  });
});
