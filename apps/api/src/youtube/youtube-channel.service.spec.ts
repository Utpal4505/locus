import crypto from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@locus/database';
import { encryptToken } from '../crypto/index.js';
import type { User } from '../auth/auth.js';
import { YoutubeChannelService } from './youtube-channel.service.js';
import { YoutubeController } from './youtube.controller.js';

const TEST_KEY = crypto.randomBytes(32).toString('hex');

describe('YoutubeChannelService & Channel Controller Endpoints', () => {
  let service: YoutubeChannelService;
  let controller: YoutubeController;

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

    service = new YoutubeChannelService();
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
      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([]),
          }),
        }),
      } as any);

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
      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([
              {
                status: 'connected',
                encryptedAccessToken: 'invalid_encrypted_format',
              },
            ]),
          }),
        }),
      } as any);

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

      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([
              {
                status: 'connected',
                encryptedAccessToken: validEncryptedToken,
              },
            ]),
          }),
        }),
      } as any);

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

      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([
              {
                status: 'connected',
                encryptedAccessToken: validEncryptedToken,
              },
            ]),
          }),
        }),
      } as any);

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

      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([
              {
                status: 'connected',
                encryptedAccessToken: validEncryptedToken,
              },
            ]),
          }),
        }),
      } as any);

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

      // 1. Integration query
      const selectSpy = vi.spyOn(db, 'select');
      selectSpy.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([
              {
                status: 'connected',
                encryptedAccessToken: validEncryptedToken,
              },
            ]),
          }),
        }),
      } as any);

      // 2. Fetch page 1 (with nextPageToken) and page 2
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

      // 3. Mock db.insert for sources
      const upsertedSources: any[] = [];
      const insertSpy = vi.spyOn(db, 'insert');
      insertSpy.mockImplementation(() => {
        return {
          values: vi.fn().mockImplementation((val) => {
            upsertedSources.push(val);
            return {
              onConflictDoUpdate: vi.fn().mockResolvedValue([]),
              onConflictDoNothing: vi.fn().mockResolvedValue([]),
            };
          }),
        } as any;
      });

      // 4. Mock select for userPreferences
      selectSpy.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([
              {
                feedPreferences: {
                  importedChannelIds: ['UC_existing_ch'],
                  existingSetting: 'value',
                },
              },
            ]),
          }),
        }),
      } as any);

      const result = await service.importSubscriptions('usr_test_123');

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result.importedCount).toBe(2);
      // "UC_existing_ch" + "UC_channel_1" + "UC_channel_2" = 3 total
      expect(result.totalAvailable).toBe(3);

      // Verify sources were formatted properly
      const sourceChannelIds = upsertedSources.map((s) => s.externalId);
      expect(sourceChannelIds).toContain('UC_channel_1');
      expect(sourceChannelIds).toContain('UC_channel_2');
      expect(sourceChannelIds).not.toContain('UC_existing_ch'); // Only new ones fetched are upserted
    });
  });

  describe('listChannels', () => {
    it('returns empty list if user has no imported channels in preferences', async () => {
      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([
              {
                feedPreferences: {},
              },
            ]),
          }),
        }),
      } as any);

      const result = await service.listChannels('usr_test_123');
      expect(result).toEqual({ channels: [], total: 0 });
    });

    it('returns formatted channels with isFollowed flag based on source_subscriptions join', async () => {
      const selectSpy = vi.spyOn(db, 'select');

      // 1. User preferences select
      selectSpy.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([
              {
                feedPreferences: {
                  importedChannelIds: ['UC_channel_1', 'UC_channel_2'],
                },
              },
            ]),
          }),
        }),
      } as any);

      // 2. Sources query with join
      selectSpy.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          leftJoin: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              orderBy: vi.fn().mockResolvedValueOnce([
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
              ]),
            }),
          }),
        }),
      } as any);

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
      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([]),
          }),
        }),
      } as any);

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
      const selectSpy = vi.spyOn(db, 'select');

      // 1. Channel lookup succeeds
      selectSpy.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([
              {
                id: '00000000-0000-0000-0000-000000000001',
                externalId: 'UC_other_user_channel',
              },
            ]),
          }),
        }),
      } as any);

      // 2. User preferences check shows channel is NOT in importedChannelIds
      selectSpy.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([
              {
                feedPreferences: {
                  importedChannelIds: ['UC_channel_1'],
                },
              },
            ]),
          }),
        }),
      } as any);

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
      const selectSpy = vi.spyOn(db, 'select');

      // 1. Channel lookup
      selectSpy.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([
              {
                id: '00000000-0000-0000-0000-000000000001',
                externalId: 'UC_channel_1',
              },
            ]),
          }),
        }),
      } as any);

      // 2. User preferences check
      selectSpy.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([
              {
                feedPreferences: {
                  importedChannelIds: ['UC_channel_1'],
                },
              },
            ]),
          }),
        }),
      } as any);

      // 3. Insert into sourceSubscriptions
      let insertedSubscription: any = null;
      vi.spyOn(db, 'insert').mockReturnValueOnce({
        values: vi.fn().mockImplementation((val) => {
          insertedSubscription = val;
          return {
            onConflictDoNothing: vi.fn().mockResolvedValueOnce([]),
          };
        }),
      } as any);

      const result = await service.followChannel(
        'usr_test_123',
        'UC_channel_1',
      );
      expect(result).toEqual({
        sourceId: '00000000-0000-0000-0000-000000000001',
        channelId: 'UC_channel_1',
        isFollowed: true,
      });
      expect(insertedSubscription).toEqual({
        userId: 'usr_test_123',
        sourceId: '00000000-0000-0000-0000-000000000001',
      });
    });
  });

  describe('unfollowChannel', () => {
    it("deletes user's subscription idempotently without deleting the shared source", async () => {
      // 1. Channel lookup
      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([
              {
                id: '00000000-0000-0000-0000-000000000001',
                externalId: 'UC_channel_1',
              },
            ]),
          }),
        }),
      } as any);

      // 2. Delete subscription
      const deleteWhereSpy = vi.fn().mockResolvedValueOnce([]);
      vi.spyOn(db, 'delete').mockReturnValueOnce({
        where: deleteWhereSpy,
      } as any);

      const result = await service.unfollowChannel(
        'usr_test_123',
        'UC_channel_1',
      );
      expect(result).toEqual({
        sourceId: '00000000-0000-0000-0000-000000000001',
        channelId: 'UC_channel_1',
        isFollowed: false,
      });
      expect(deleteWhereSpy).toHaveBeenCalledTimes(1);
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
  });
});
