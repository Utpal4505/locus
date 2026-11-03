import { beforeEach, describe, expect, it, vi } from 'vitest';
import { YoutubeSyncRepository } from './youtube-sync.repository.js';
import type { DrizzleDb } from '../../database/index.js';

describe('YoutubeSyncRepository', () => {
  let repository: YoutubeSyncRepository;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    };

    repository = new YoutubeSyncRepository(mockDb as unknown as DrizzleDb);
    vi.restoreAllMocks();
  });

  describe('findLatestRun', () => {
    it('returns the most recent sync run if found', async () => {
      const mockRun = { id: 'run_1', status: 'succeeded' };
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            orderBy: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockResolvedValueOnce([mockRun]),
            }),
          }),
        }),
      });

      const result = await repository.findLatestRun('u1');
      expect(result).toEqual(mockRun);
    });

    it('returns null if no sync run found', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            orderBy: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockResolvedValueOnce([]),
            }),
          }),
        }),
      });

      const result = await repository.findLatestRun('u1');
      expect(result).toBeNull();
    });
  });

  describe('findLatestSucceededRun', () => {
    it('returns the most recent succeeded run', async () => {
      const completedAt = new Date();
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            orderBy: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockResolvedValueOnce([{ completedAt }]),
            }),
          }),
        }),
      });

      const result = await repository.findLatestSucceededRun('u1');
      expect(result).toEqual({ completedAt });
    });
  });

  describe('createRun', () => {
    it('inserts a new running sync run and returns its id', async () => {
      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
          returning: vi.fn().mockResolvedValueOnce([{ id: 'new_run_id' }]),
        }),
      });

      const runId = await repository.createRun('u1', 'manual');
      expect(runId).toBe('new_run_id');
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('updateRunSuccess', () => {
    it('updates run to succeeded status', async () => {
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([]),
        }),
      });

      await repository.updateRunSuccess('run_1', {
        completedAt: new Date(),
        itemsFound: 5,
        itemsCreated: 5,
      });

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('updateRunFailure', () => {
    it('updates run to failed status with error summary', async () => {
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([]),
        }),
      });

      await repository.updateRunFailure('run_1', 'Rate limit exceeded');
      expect(mockDb.update).toHaveBeenCalled();
    });
  });
});

