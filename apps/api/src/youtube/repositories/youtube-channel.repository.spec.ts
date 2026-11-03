import { beforeEach, describe, expect, it, vi } from 'vitest';
import { YoutubeChannelRepository } from './youtube-channel.repository.js';
import type { DrizzleDb } from '../../database/index.js';

describe('YoutubeChannelRepository', () => {
  let repository: YoutubeChannelRepository;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      transaction: vi.fn(),
    };

    repository = new YoutubeChannelRepository(mockDb as unknown as DrizzleDb);
    vi.restoreAllMocks();
  });

  describe('findUserIntegration', () => {
    it('returns integration record if exists', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([{ status: 'connected' }]),
          }),
        }),
      });

      const res = await repository.findUserIntegration('u1');
      expect(res).toEqual({ status: 'connected' });
    });

    it('returns null if not found', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([]),
          }),
        }),
      });

      const res = await repository.findUserIntegration('u1');
      expect(res).toBeNull();
    });
  });

  describe('upsertSources', () => {
    it('returns empty array when input is empty', async () => {
      const res = await repository.upsertSources([]);
      expect(res).toEqual([]);
    });

    it('chunks and upserts sources', async () => {
      const mockSources = [{ id: 's1', externalId: 'c1' }];
      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
          onConflictDoUpdate: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce(mockSources),
          }),
        }),
      });

      const res = await repository.upsertSources([
        {
          externalId: 'c1',
          type: 'youtube_channel',
          name: 'Channel 1',
          url: 'https://youtube.com/c1',
          description: null,
          imageUrl: null,
          isActive: true,
          updatedAt: new Date(),
        },
      ]);
      expect(res).toEqual(mockSources);
    });
  });

  describe('upsertYoutubeChannels', () => {
    it('upserts channel sources with conflict resolution', async () => {
      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
          onConflictDoUpdate: vi.fn().mockResolvedValueOnce([]),
        }),
      });

      await repository.upsertYoutubeChannels([
        {
          externalId: 'ch1',
          name: 'Channel 1',
          url: 'https://youtube.com/ch1',
          description: null,
          imageUrl: null,
          feedUrl: 'https://feed.xml',
        },
      ]);

      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });
  });

  describe('findSourceByExternalId & findSourceById', () => {
    it('finds source by external ID', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([{ id: 's1', externalId: 'ext_1' }]),
          }),
        }),
      });

      const res = await repository.findSourceByExternalId('ext_1');
      expect(res).toEqual({ id: 's1', externalId: 'ext_1' });
    });

    it('finds source by ID', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([{ id: 's1', externalId: 'ext_1' }]),
          }),
        }),
      });

      const res = await repository.findSourceById('s1');
      expect(res).toEqual({ id: 's1', externalId: 'ext_1' });
    });
  });

  describe('findFollowedChannels & findFollowedChannelsForSync', () => {
    it('returns followed channels with join', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          innerJoin: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockResolvedValueOnce([{ id: 's1', name: 'Chan 1' }]),
          }),
        }),
      });

      const res = await repository.findFollowedChannels('u1');
      expect(res).toEqual([{ id: 's1', name: 'Chan 1' }]);
    });

    it('returns followed channels for sync', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          innerJoin: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockResolvedValueOnce([{ id: 's1', externalId: 'e1', name: 'Chan 1' }]),
          }),
        }),
      });

      const res = await repository.findFollowedChannelsForSync('u1');
      expect(res).toEqual([{ id: 's1', externalId: 'e1', name: 'Chan 1' }]);
    });
  });

  describe('followChannel & unfollowChannel', () => {
    it('follows channel idempotently', async () => {
      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
          onConflictDoNothing: vi.fn().mockResolvedValueOnce([]),
        }),
      });

      const res = await repository.followChannel('u1', 's1');
      expect(res).toBe(true);
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });

    it('unfollows channel', async () => {
      mockDb.delete.mockReturnValueOnce({
        where: vi.fn().mockResolvedValueOnce([]),
      });

      const res = await repository.unfollowChannel('u1', 's1');
      expect(res).toBe(true);
      expect(mockDb.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe('bulkFollowChannels & findFollowedSourceIds', () => {
    it('bulk follows channels returning count', async () => {
      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
          onConflictDoNothing: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([{ id: 'sub_1' }]),
          }),
        }),
      });

      const count = await repository.bulkFollowChannels('u1', ['s1']);
      expect(count).toBe(1);
    });

    it('finds followed source IDs', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([{ sourceId: 's1' }]),
        }),
      });

      const res = await repository.findFollowedSourceIds('u1', ['s1', 's2']);
      expect(res).toEqual(['s1']);
    });
  });

  describe('userPreferences helpers', () => {
    it('getImportedChannelIds returns ids or empty array', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([
              { feedPreferences: { importedChannelIds: ['c1', 'c2'] } },
            ]),
          }),
        }),
      });

      const res = await repository.getImportedChannelIds('u1');
      expect(res).toEqual(['c1', 'c2']);
    });

    it('addImportedChannelIds merges new ids with existing', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([
              { feedPreferences: { importedChannelIds: ['c1'] } },
            ]),
          }),
        }),
      });

      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
          onConflictDoUpdate: vi.fn().mockResolvedValueOnce([]),
        }),
      });

      const res = await repository.addImportedChannelIds('u1', ['c2']);
      expect(res).toEqual(['c1', 'c2']);
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });
  });

  describe('findChannelByIdentifier & findChannelsByIdentifiers', () => {
    it('finds channel by UUID', async () => {
      const uuid = '00000000-0000-0000-0000-000000000001';
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([{ id: uuid }]),
          }),
        }),
      });

      const res = await repository.findChannelByIdentifier(uuid);
      expect(res).toEqual({ id: uuid });
    });

    it('finds channels by identifiers (uuids and external ids)', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([{ id: 's1', externalId: 'ext_1' }]),
        }),
      });

      const res = await repository.findChannelsByIdentifiers(['s1'], ['ext_1']);
      expect(res).toEqual([{ id: 's1', externalId: 'ext_1' }]);
    });
  });

  describe('insertSubscriptions', () => {
    it('inserts subscriptions using transaction when supported', async () => {
      const mockTx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            onConflictDoNothing: vi.fn().mockResolvedValue([]),
          }),
        }),
      };
      mockDb.transaction.mockImplementationOnce(async (cb: any) => cb(mockTx));

      await repository.insertSubscriptions('u1', ['s1', 's2']);
      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockTx.insert).toHaveBeenCalled();
    });
  });
});

