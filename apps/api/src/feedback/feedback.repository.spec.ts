import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedbackRepository } from './feedback.repository.js';
import type { DrizzleDb } from '../database/index.js';

describe('FeedbackRepository', () => {
  let repository: FeedbackRepository;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      insert: vi.fn(),
      select: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    repository = new FeedbackRepository(mockDb as unknown as DrizzleDb);
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('inserts and returns feedback record', async () => {
      const mockRecord = { id: 'fb-1', title: 'Broken UI' };
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockRecord]),
        }),
      });

      const result = await repository.create({
        type: 'bug',
        title: 'Broken UI',
        description: 'Detail',
        priority: 'medium',
        status: 'open',
      });
      expect(result).toEqual(mockRecord);
    });
  });

  describe('findById', () => {
    it('returns feedback record if found', async () => {
      const mockRecord = { id: 'fb-1' };
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockRecord]),
          }),
        }),
      });

      const result = await repository.findById('fb-1');
      expect(result).toEqual(mockRecord);
    });

    it('returns null if not found', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await repository.findById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('findManyWithCount', () => {
    it('applies filters, returns count and paginated rows', async () => {
      const mockRows = [{ id: 'fb-1' }];
      mockDb.select.mockImplementation((fields?: any) => {
        if (fields && 'count' in fields) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ count: 1 }]),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue(mockRows),
                }),
              }),
            }),
          }),
        };
      });

      const result = await repository.findManyWithCount(
        { type: 'bug', search: 'crash' },
        { limit: 10, offset: 0 },
      );
      expect(result.total).toBe(1);
      expect(result.rows).toEqual(mockRows);
    });
  });

  describe('findAllForStats', () => {
    it('selects all feedback records', async () => {
      const mockRows = [{ id: 'fb-1' }, { id: 'fb-2' }];
      mockDb.select.mockReturnValue({
        from: vi.fn().mockResolvedValue(mockRows),
      });

      const result = await repository.findAllForStats();
      expect(result).toEqual(mockRows);
    });
  });

  describe('update', () => {
    it('updates and returns feedback record', async () => {
      const mockRecord = { id: 'fb-1', status: 'resolved' };
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockRecord]),
          }),
        }),
      });

      const result = await repository.update('fb-1', { status: 'resolved' });
      expect(result).toEqual(mockRecord);
    });
  });

  describe('delete', () => {
    it('deletes feedback record by id', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      });

      const result = await repository.delete('fb-1');
      expect(result).toBe(true);
    });
  });
});

