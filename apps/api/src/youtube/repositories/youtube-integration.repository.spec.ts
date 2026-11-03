import { beforeEach, describe, expect, it, vi } from 'vitest';
import { YoutubeIntegrationRepository } from './youtube-integration.repository.js';
import type { DrizzleDb } from '../../database/index.js';

describe('YoutubeIntegrationRepository', () => {
  let repository: YoutubeIntegrationRepository;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    };

    repository = new YoutubeIntegrationRepository(mockDb as unknown as DrizzleDb);
    vi.restoreAllMocks();
  });

  describe('findByUserId', () => {
    it('returns an integration record if found', async () => {
      const mockRecord = {
        id: 'int_123',
        userId: 'usr_1',
        provider: 'youtube',
        status: 'connected',
      };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([mockRecord]),
          }),
        }),
      });

      const result = await repository.findByUserId('usr_1');
      expect(result).toEqual(mockRecord);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('returns null if not found', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([]),
          }),
        }),
      });

      const result = await repository.findByUserId('usr_unknown');
      expect(result).toBeNull();
    });
  });

  describe('saveIntegration', () => {
    it('upserts and returns the saved integration', async () => {
      const mockRecord = {
        id: 'int_saved',
        userId: 'usr_1',
        provider: 'youtube',
        status: 'connected',
      };

      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
          onConflictDoUpdate: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([mockRecord]),
          }),
        }),
      });

      const result = await repository.saveIntegration('usr_1', {
        userId: 'usr_1',
        externalAccountId: 'UC_channel_1',
        encryptedAccessToken: 'enc_at',
        encryptedRefreshToken: 'enc_rt',
        tokenExpiresAt: new Date(),
        scopes: 'youtube.readonly',
        status: 'connected',
      });

      expect(result).toEqual(mockRecord);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('updates integration status in database', async () => {
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([]),
        }),
      });

      await repository.updateStatus('usr_1', 'expired');
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('updateRefreshedToken', () => {
    it('updates token and expiration', async () => {
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([]),
        }),
      });

      await repository.updateRefreshedToken('usr_1', {
        encryptedAccessToken: 'new_enc_at',
        tokenExpiresAt: new Date(),
        status: 'connected',
        encryptedRefreshToken: 'new_enc_rt',
        updatedAt: new Date(),
      });

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('findAllConnectedUsers', () => {
    it('returns all user IDs with connected youtube integration', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([{ userId: 'u1' }, { userId: 'u2' }]),
        }),
      });

      const result = await repository.findAllConnectedUsers();
      expect(result).toEqual([{ userId: 'u1' }, { userId: 'u2' }]);
    });
  });
});

