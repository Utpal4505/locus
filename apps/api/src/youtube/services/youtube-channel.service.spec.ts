import crypto from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encryptToken } from '../../common/crypto/index.js';
import type { User } from '../../auth/auth.js';
import {
  parseChannelInput,
  YoutubeChannelService,
} from './youtube-channel.service.js';
import { YoutubeController } from '../controllers/youtube.controller.js';
import type { YoutubeChannelRepository } from '../repositories/youtube-channel.repository.js';
import type { YoutubeIntegrationRepository } from '../repositories/youtube-integration.repository.js';

const TEST_KEY = crypto.randomBytes(32).toString('hex');

describe('YoutubeChannelService & Channel Controller Endpoints', () => {
  let service: YoutubeChannelService;
  let controller: YoutubeController;
  let mockChannelRepo: Record<keyof YoutubeChannelRepository, any>;
  let mockIntegrationRepo: Record<keyof YoutubeIntegrationRepository, any>;

  const originalEnv = { ...process.env };

  const mockUser: User = {
    id: 'usr_test_123',
    email: 'test@example.com',
    name: 'Test User',
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
      upsertYoutubeChannels: vi.fn().mockResolvedValue(undefined),
      findSourceByExternalId: vi.fn(),
      findSourceById: vi.fn(),
      findFollowedChannels: vi.fn(),
      findFollowedChannelsForSync: vi.fn(),
      findUserSubscription: vi.fn(),
      followChannel: vi.fn().mockResolvedValue(true),
      unfollowChannel: vi.fn().mockResolvedValue(true),
      bulkFollowChannels: vi.fn(),
      findFollowedSourceIds: vi.fn().mockResolvedValue([]),
      findSourcesByExternalIds: vi.fn(),
      updateLastFetchedAt: vi.fn().mockResolvedValue(undefined),
      getImportedChannelIds: vi.fn().mockResolvedValue([]),
      addImportedChannelIds: vi.fn().mockResolvedValue([]),
      listImportedChannels: vi.fn().mockResolvedValue([]),
      searchChannels: vi.fn().mockResolvedValue([]),
      findChannelByIdentifier: vi.fn(),
      findChannelsByIdentifiers: vi.fn().mockResolvedValue([]),
      insertSubscriptions: vi.fn().mockResolvedValue(undefined),
    };

    mockIntegrationRepo = {
      findByUserId: vi.fn(),
      saveIntegration: vi.fn(),
      updateStatus: vi.fn(),
      updateRefreshedToken: vi.fn(),
      findAllConnectedUsers: vi.fn(),
    };

    service = new YoutubeChannelService(
      mockChannelRepo as unknown as YoutubeChannelRepository,
      mockIntegrationRepo as unknown as YoutubeIntegrationRepository,
    );

    controller = new YoutubeController(
      {} as any,
      {} as any,
      service,
      {} as any,
    );

    vi.restoreAllMocks();
  });

  describe('importSubscriptions', () => {
    it('throws BadRequestException with YOUTUBE_NOT_CONNECTED if user has no connected integration', async () => {
      mockIntegrationRepo.findByUserId.mockResolvedValueOnce(null);

      await expect(
        service.importSubscriptions('usr_test_123'),
      ).rejects.toMatchObject({
        response: {
          code: 'YOUTUBE_NOT_CONNECTED',
        },
        status: 400,
      });
    });

    it('throws UnauthorizedException with YOUTUBE_REAUTH_REQUIRED if access token decryption fails', async () => {
      mockIntegrationRepo.findByUserId.mockResolvedValueOnce({
        status: 'connected',
        encryptedAccessToken: 'invalid_encrypted_format',
      });

      await expect(
        service.importSubscriptions('usr_test_123'),
      ).rejects.toMatchObject({
        response: {
          code: 'YOUTUBE_REAUTH_REQUIRED',
        },
        status: 401,
      });
    });

    it('throws UnauthorizedException with YOUTUBE_REAUTH_REQUIRED if YouTube API returns 401', async () => {
      const validEncryptedToken = encryptToken('ya29.sample_token');

      mockIntegrationRepo.findByUserId.mockResolvedValueOnce({
        status: 'connected',
        encryptedAccessToken: validEncryptedToken,
      });

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        status: 401,
        ok: false,
      } as Response);

      await expect(
        service.importSubscriptions('usr_test_123'),
      ).rejects.toMatchObject({
        response: {
          code: 'YOUTUBE_REAUTH_REQUIRED',
        },
        status: 401,
      });
    });

    it('throws 429 HttpException with YOUTUBE_API_ERROR if YouTube API quota is exceeded', async () => {
      const validEncryptedToken = encryptToken('ya29.sample_token');

      mockIntegrationRepo.findByUserId.mockResolvedValueOnce({
        status: 'connected',
        encryptedAccessToken: validEncryptedToken,
      });

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
        service.importSubscriptions('usr_test_123'),
      ).rejects.toMatchObject({
        response: {
          code: 'YOUTUBE_API_ERROR',
        },
        status: 429,
      });
    });

    it('throws BadGatewayException with YOUTUBE_API_ERROR if YouTube API responds with server error', async () => {
      const validEncryptedToken = encryptToken('ya29.sample_token');

      mockIntegrationRepo.findByUserId.mockResolvedValueOnce({
        status: 'connected',
        encryptedAccessToken: validEncryptedToken,
      });

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        status: 500,
        ok: false,
      } as Response);

      await expect(
        service.importSubscriptions('usr_test_123'),
      ).rejects.toMatchObject({
        response: {
          code: 'YOUTUBE_API_ERROR',
        },
        status: 502,
      });
    });

    it('paginates YouTube subscriptions, upserts sources, updates user preferences, and skips malformed items', async () => {
      const validEncryptedToken = encryptToken('ya29.sample_token');

      mockIntegrationRepo.findByUserId.mockResolvedValueOnce({
        status: 'connected',
        encryptedAccessToken: validEncryptedToken,
      });

      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      fetchSpy.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          nextPageToken: 'page_2_token',
          items: [
            {
              snippet: {
                title: 'Channel One',
                description: 'Desc One',
                resourceId: { channelId: 'UC_channel_1' },
                thumbnails: { high: { url: 'https://thumb1.jpg' } },
              },
            },
            {
              // Malformed item without resourceId
              snippet: {
                title: 'Invalid Channel',
              },
            },
          ],
        }),
      } as Response);

      fetchSpy.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          items: [
            {
              snippet: {
                title: 'Channel Two',
                resourceId: { channelId: 'UC_channel_2' },
              },
            },
          ],
        }),
      } as Response);

      mockChannelRepo.addImportedChannelIds.mockResolvedValueOnce([
        'UC_existing_ch',
        'UC_channel_1',
        'UC_channel_2',
      ]);

      const result = await service.importSubscriptions('usr_test_123');

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result.importedCount).toBe(2);
      expect(result.totalAvailable).toBe(3);
      expect(mockChannelRepo.upsertYoutubeChannels).toHaveBeenCalledTimes(1);
      const upserted = mockChannelRepo.upsertYoutubeChannels.mock.calls[0][0];
      const sourceChannelIds = upserted.map((s: any) => s.externalId);
      expect(sourceChannelIds).toContain('UC_channel_1');
      expect(sourceChannelIds).toContain('UC_channel_2');
      expect(sourceChannelIds).not.toContain('UC_existing_ch');
    });
  });

  describe('listChannels', () => {
    it('returns empty list if user has no imported channels in preferences', async () => {
      mockChannelRepo.getImportedChannelIds.mockResolvedValueOnce([]);

      const result = await service.listChannels('usr_test_123');
      expect(result).toEqual({ channels: [], total: 0 });
    });

    it('returns formatted channels with isFollowed flag based on source_subscriptions join', async () => {
      mockChannelRepo.getImportedChannelIds.mockResolvedValueOnce([
        'UC_channel_1',
        'UC_channel_2',
      ]);

      mockChannelRepo.listImportedChannels.mockResolvedValueOnce([
        {
          id: '00000000-0000-0000-0000-000000000001',
          externalId: 'UC_channel_1',
          name: 'Channel One',
          url: 'https://www.youtube.com/channel/UC_channel_1',
          description: 'Desc 1',
          thumbnailUrl: 'https://thumb1.jpg',
          isFollowed: true,
        },
        {
          id: '00000000-0000-0000-0000-000000000002',
          externalId: 'UC_channel_2',
          name: 'Channel Two',
          url: 'https://www.youtube.com/channel/UC_channel_2',
          description: null,
          thumbnailUrl: null,
          isFollowed: false,
        },
      ]);

      const result = await service.listChannels('usr_test_123');
      expect(result.total).toBe(2);
      expect(result.channels).toHaveLength(2);
      expect(result.channels[0]).toEqual({
        id: '00000000-0000-0000-0000-000000000001',
        externalId: 'UC_channel_1',
        name: 'Channel One',
        url: 'https://www.youtube.com/channel/UC_channel_1',
        description: 'Desc 1',
        thumbnailUrl: 'https://thumb1.jpg',
        isFollowed: true,
      });
      expect(result.channels[1].isFollowed).toBe(false);
    });
  });

  describe('followChannel', () => {
    it('throws NotFoundException if channel does not exist in sources', async () => {
      mockChannelRepo.findChannelByIdentifier.mockResolvedValueOnce(null);

      await expect(
        service.followChannel('usr_test_123', 'UC_not_found'),
      ).rejects.toMatchObject({
        response: {
          code: 'CHANNEL_NOT_FOUND',
        },
        status: 404,
      });
    });

    it("throws BadRequestException with CHANNEL_NOT_AVAILABLE if channel is not in user's imported collection", async () => {
      mockChannelRepo.findChannelByIdentifier.mockResolvedValueOnce({
        id: '00000000-0000-0000-0000-000000000001',
        externalId: 'UC_other_user_channel',
      });
      mockChannelRepo.getImportedChannelIds.mockResolvedValueOnce(['UC_channel_1']);

      await expect(
        service.followChannel('usr_test_123', 'UC_other_user_channel'),
      ).rejects.toMatchObject({
        response: {
          code: 'CHANNEL_NOT_AVAILABLE',
        },
        status: 400,
      });
    });

    it('successfully follows an imported channel idempotently', async () => {
      mockChannelRepo.findChannelByIdentifier.mockResolvedValueOnce({
        id: '00000000-0000-0000-0000-000000000001',
        externalId: 'UC_channel_1',
      });
      mockChannelRepo.getImportedChannelIds.mockResolvedValueOnce(['UC_channel_1']);

      const result = await service.followChannel(
        'usr_test_123',
        'UC_channel_1',
      );
      expect(result).toEqual({
        sourceId: '00000000-0000-0000-0000-000000000001',
        channelId: 'UC_channel_1',
        isFollowed: true,
      });
      expect(mockChannelRepo.followChannel).toHaveBeenCalledWith(
        'usr_test_123',
        '00000000-0000-0000-0000-000000000001',
      );
    });
  });

  describe('unfollowChannel', () => {
    it("deletes user's subscription idempotently without deleting the shared source", async () => {
      mockChannelRepo.findChannelByIdentifier.mockResolvedValueOnce({
        id: '00000000-0000-0000-0000-000000000001',
        externalId: 'UC_channel_1',
      });

      const result = await service.unfollowChannel(
        'usr_test_123',
        'UC_channel_1',
      );
      expect(result).toEqual({
        sourceId: '00000000-0000-0000-0000-000000000001',
        channelId: 'UC_channel_1',
        isFollowed: false,
      });
      expect(mockChannelRepo.unfollowChannel).toHaveBeenCalledWith(
        'usr_test_123',
        '00000000-0000-0000-0000-000000000001',
      );
    });
  });

  describe('bulkFollowChannels', () => {
    it('throws BadRequestException with VALIDATION_ERROR if channelIds is empty', async () => {
      await expect(
        service.bulkFollowChannels('usr_test_123', []),
      ).rejects.toMatchObject({
        response: {
          code: 'VALIDATION_ERROR',
        },
        status: 400,
      });
    });

    it('throws BadRequestException with VALIDATION_ERROR if channelIds exceeds 100 items', async () => {
      const oversized = Array.from(
        { length: 101 },
        (_, i) => `UC_channel_${i}`,
      );
      await expect(
        service.bulkFollowChannels('usr_test_123', oversized),
      ).rejects.toMatchObject({
        response: {
          code: 'VALIDATION_ERROR',
        },
        status: 400,
      });
    });

    it('throws BadRequestException with VALIDATION_ERROR if any channel ID is whitespace or invalid', async () => {
      await expect(
        service.bulkFollowChannels('usr_test_123', ['   ']),
      ).rejects.toMatchObject({
        response: {
          code: 'VALIDATION_ERROR',
        },
        status: 400,
      });
    });

    it('throws BadRequestException with CHANNEL_NOT_AVAILABLE if user has no imported channels in preferences', async () => {
      mockChannelRepo.getImportedChannelIds.mockResolvedValueOnce([]);

      await expect(
        service.bulkFollowChannels('usr_test_123', ['UC_channel_1']),
      ).rejects.toMatchObject({
        response: {
          code: 'CHANNEL_NOT_AVAILABLE',
        },
        status: 400,
      });
    });

    it('throws NotFoundException with CHANNEL_NOT_FOUND if any requested channel does not exist in sources', async () => {
      mockChannelRepo.getImportedChannelIds.mockResolvedValueOnce([
        'UC_channel_1',
        'UC_channel_2',
      ]);
      mockChannelRepo.findChannelsByIdentifiers.mockResolvedValueOnce([
        {
          id: '00000000-0000-0000-0000-000000000001',
          externalId: 'UC_channel_1',
          name: 'Channel One',
        },
      ]);

      await expect(
        service.bulkFollowChannels('usr_test_123', [
          'UC_channel_1',
          'UC_channel_2',
        ]),
      ).rejects.toMatchObject({
        response: {
          code: 'CHANNEL_NOT_FOUND',
        },
        status: 404,
      });
    });

    it("throws BadRequestException with CHANNEL_NOT_AVAILABLE if channel is in sources but not in user's imported preferences", async () => {
      mockChannelRepo.getImportedChannelIds.mockResolvedValueOnce(['UC_channel_1']);
      mockChannelRepo.findChannelsByIdentifiers.mockResolvedValueOnce([
        {
          id: '00000000-0000-0000-0000-000000000001',
          externalId: 'UC_channel_1',
          name: 'Channel 1',
        },
        {
          id: '00000000-0000-0000-0000-000000000002',
          externalId: 'UC_channel_other',
          name: 'Other Channel',
        },
      ]);

      await expect(
        service.bulkFollowChannels('usr_test_123', [
          'UC_channel_1',
          'UC_channel_other',
        ]),
      ).rejects.toMatchObject({
        response: {
          code: 'CHANNEL_NOT_AVAILABLE',
        },
        status: 400,
      });
    });

    it('successfully follows multiple channels, handles duplicates and already-followed channels idempotently', async () => {
      mockChannelRepo.getImportedChannelIds.mockResolvedValueOnce([
        'UC_channel_1',
        'UC_channel_2',
      ]);
      mockChannelRepo.findChannelsByIdentifiers.mockResolvedValueOnce([
        {
          id: '00000000-0000-0000-0000-000000000001',
          externalId: 'UC_channel_1',
          name: 'Channel 1',
        },
        {
          id: '00000000-0000-0000-0000-000000000002',
          externalId: 'UC_channel_2',
          name: 'Channel 2',
        },
      ]);
      mockChannelRepo.findFollowedSourceIds.mockResolvedValueOnce([
        '00000000-0000-0000-0000-000000000001',
      ]);

      // Duplicate passed in request: ['UC_channel_1', 'UC_channel_2', 'UC_channel_1']
      const result = await service.bulkFollowChannels('usr_test_123', [
        'UC_channel_1',
        'UC_channel_2',
        'UC_channel_1',
      ]);

      expect(result).toEqual({
        followedCount: 1, // Only UC_channel_2 is new
        alreadyFollowedCount: 1, // UC_channel_1 was already followed
        totalRequested: 2, // 2 unique channels requested
        followedChannelIds: [
          '00000000-0000-0000-0000-000000000002',
        ],
      });

      expect(mockChannelRepo.insertSubscriptions).toHaveBeenCalledWith(
        'usr_test_123',
        ['00000000-0000-0000-0000-000000000002'],
      );
    });

    it('deduplicates alias identifiers (UUID and external ID for the same channel) consistently', async () => {
      mockChannelRepo.getImportedChannelIds.mockResolvedValueOnce(['UC_channel_1']);
      mockChannelRepo.findChannelsByIdentifiers.mockResolvedValueOnce([
        {
          id: '00000000-0000-0000-0000-000000000001',
          externalId: 'UC_channel_1',
          name: 'Channel 1',
        },
      ]);
      mockChannelRepo.findFollowedSourceIds.mockResolvedValueOnce([]);

      // Both UUID and external ID for the same channel passed in request
      const result = await service.bulkFollowChannels('usr_test_123', [
        '00000000-0000-0000-0000-000000000001',
        'UC_channel_1',
      ]);

      expect(result).toEqual({
        followedCount: 1,
        alreadyFollowedCount: 0,
        totalRequested: 1, // Deduplicated to 1 distinct channel
        followedChannelIds: ['00000000-0000-0000-0000-000000000001'],
      });

      expect(mockChannelRepo.insertSubscriptions).toHaveBeenCalledWith(
        'usr_test_123',
        ['00000000-0000-0000-0000-000000000001'],
      );
    });

    it('propagates database transaction error if batch insert fails', async () => {
      mockChannelRepo.getImportedChannelIds.mockResolvedValueOnce(['UC_channel_1']);
      mockChannelRepo.findChannelsByIdentifiers.mockResolvedValueOnce([
        {
          id: '00000000-0000-0000-0000-000000000001',
          externalId: 'UC_channel_1',
          name: 'Channel 1',
        },
      ]);
      mockChannelRepo.findFollowedSourceIds.mockResolvedValueOnce([]);
      mockChannelRepo.insertSubscriptions.mockRejectedValueOnce(
        new Error('Database transaction lock error'),
      );

      await expect(
        service.bulkFollowChannels('usr_test_123', ['UC_channel_1']),
      ).rejects.toThrow('Database transaction lock error');
    });
  });

  describe('YoutubeController Delegations', () => {
    it('delegates importSubscriptions to service', async () => {
      const spy = vi
        .spyOn(service, 'importSubscriptions')
        .mockResolvedValueOnce({ importedCount: 5, totalAvailable: 10 });

      const res = await controller.importSubscriptions(mockUser);
      expect(spy).toHaveBeenCalledWith(mockUser.id);
      expect(res).toEqual({ importedCount: 5, totalAvailable: 10 });
    });

    it('delegates listChannels to service', async () => {
      const spy = vi
        .spyOn(service, 'listChannels')
        .mockResolvedValueOnce({ channels: [], total: 0 });

      const res = await controller.listChannels(mockUser);
      expect(spy).toHaveBeenCalledWith(mockUser.id);
      expect(res).toEqual({ channels: [], total: 0 });
    });

    it('delegates followChannel to service', async () => {
      const spy = vi.spyOn(service, 'followChannel').mockResolvedValueOnce({
        sourceId: 'src_1',
        channelId: 'UC_1',
        isFollowed: true,
      });

      const res = await controller.followChannel(mockUser, 'UC_1');
      expect(spy).toHaveBeenCalledWith(mockUser.id, 'UC_1');
      expect(res).toEqual({
        sourceId: 'src_1',
        channelId: 'UC_1',
        isFollowed: true,
      });
    });

    it('delegates unfollowChannelPost and unfollowChannelDelete to service', async () => {
      const spy = vi.spyOn(service, 'unfollowChannel').mockResolvedValue({
        sourceId: 'src_1',
        channelId: 'UC_1',
        isFollowed: false,
      });

      const resPost = await controller.unfollowChannelPost(mockUser, 'UC_1');
      expect(spy).toHaveBeenCalledWith(mockUser.id, 'UC_1');
      expect(resPost.isFollowed).toBe(false);

      const resDelete = await controller.unfollowChannelDelete(
        mockUser,
        'UC_1',
      );
      expect(spy).toHaveBeenCalledWith(mockUser.id, 'UC_1');
      expect(resDelete.isFollowed).toBe(false);
    });

    it('delegates bulkFollowChannels to service with validated payload', async () => {
      const spy = vi
        .spyOn(service, 'bulkFollowChannels')
        .mockResolvedValueOnce({
          followedCount: 2,
          alreadyFollowedCount: 0,
          totalRequested: 2,
          followedChannelIds: ['src_1', 'src_2'],
        });

      const res = await controller.bulkFollowChannels(mockUser, {
        channelIds: ['src_1', 'src_2'],
      });

      expect(spy).toHaveBeenCalledWith(mockUser.id, ['src_1', 'src_2']);
      expect(res).toEqual({
        followedCount: 2,
        alreadyFollowedCount: 0,
        totalRequested: 2,
        followedChannelIds: ['src_1', 'src_2'],
      });
    });

    it('delegates searchChannels to service with query string', async () => {
      const spy = vi.spyOn(service, 'searchChannels').mockResolvedValueOnce({
        channels: [
          {
            id: 'src_veritasium',
            externalId: 'UCHnyfMqiRRG1u-2MsSQLbXA',
            name: 'Veritasium',
            url: 'https://www.youtube.com/@veritasium',
            description: 'An element of truth',
            thumbnailUrl: 'https://thumb.jpg',
            isFollowed: false,
          },
        ],
        total: 1,
      });

      const res = await controller.searchChannels(mockUser, 'veritasium');
      expect(spy).toHaveBeenCalledWith(mockUser.id, 'veritasium');
      expect(res.total).toBe(1);
      expect(res.channels[0].name).toBe('Veritasium');
    });

    it('rejects bulkFollowChannels in controller when payload fails validation', async () => {
      await expect(
        controller.bulkFollowChannels(mockUser, { channelIds: [] }),
      ).rejects.toMatchObject({
        response: {
          code: 'VALIDATION_ERROR',
        },
        status: 400,
      });
    });
  });

  describe('parseChannelInput', () => {
    it('correctly parses direct channel ID', () => {
      const parsed = parseChannelInput('UCvjgXvBlbQiydffZU7m1_aw');
      expect(parsed).toEqual({
        type: 'channel_id',
        value: 'UCvjgXvBlbQiydffZU7m1_aw',
      });
    });

    it('correctly parses YouTube channel URL with ID', () => {
      const parsed = parseChannelInput(
        'https://www.youtube.com/channel/UCvjgXvBlbQiydffZU7m1_aw',
      );
      expect(parsed).toEqual({
        type: 'channel_id',
        value: 'UCvjgXvBlbQiydffZU7m1_aw',
      });
    });

    it('correctly parses handle starting with @', () => {
      const parsed = parseChannelInput('@fireship_dev');
      expect(parsed).toEqual({
        type: 'handle',
        value: 'fireship_dev',
      });
    });

    it('correctly parses YouTube URL with handle', () => {
      const parsed = parseChannelInput('https://youtube.com/@veritasium');
      expect(parsed).toEqual({
        type: 'handle',
        value: 'veritasium',
      });
    });

    it('correctly parses custom channel URL', () => {
      const parsed = parseChannelInput('https://www.youtube.com/c/3blue1brown');
      expect(parsed).toEqual({
        type: 'keyword',
        value: '3blue1brown',
      });
    });

    it('correctly parses plain keyword or channel name', () => {
      const parsed = parseChannelInput('Theo - t3.gg');
      expect(parsed).toEqual({
        type: 'keyword',
        value: 'Theo - t3.gg',
      });
    });
  });

  describe('searchChannels', () => {
    it('returns empty result when query is empty or whitespace', async () => {
      const res = await service.searchChannels('usr_test_123', '   ');
      expect(res).toEqual({ channels: [], total: 0 });
    });

    it('returns matching channels from local sources database and adds to imported preferences', async () => {
      mockChannelRepo.searchChannels.mockResolvedValueOnce([
        {
          id: 'src_veritasium_id',
          externalId: 'UCHnyfMqiRRG1u-2MsSQLbXA',
          name: 'Veritasium',
          url: 'https://www.youtube.com/@veritasium',
          description: 'Science videos',
          thumbnailUrl: 'https://thumb.jpg',
          isFollowed: false,
        },
      ]);
      mockChannelRepo.addImportedChannelIds.mockResolvedValueOnce([
        'UCHnyfMqiRRG1u-2MsSQLbXA',
      ]);

      const res = await service.searchChannels('usr_test_123', 'Veritasium');
      expect(res.total).toBe(1);
      expect(res.channels[0].name).toBe('Veritasium');
      expect(res.channels[0].externalId).toBe('UCHnyfMqiRRG1u-2MsSQLbXA');
      expect(mockChannelRepo.addImportedChannelIds).toHaveBeenCalledWith(
        'usr_test_123',
        ['UCHnyfMqiRRG1u-2MsSQLbXA'],
      );
    });
  });
});
