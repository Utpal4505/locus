import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PreferencesRepository } from './preferences.repository.js';
import type { DrizzleDb } from '../database/index.js';

describe('PreferencesRepository', () => {
  let repository: PreferencesRepository;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
      insert: vi.fn(),
    };
    repository = new PreferencesRepository(mockDb as unknown as DrizzleDb);
    vi.restoreAllMocks();
  });

  describe('findByUserId', () => {
    it('returns preferences record if found', async () => {
      const mockRow = { userId: 'usr_123', theme: 'dark' };
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockRow]),
          }),
        }),
      });

      const result = await repository.findByUserId('usr_123');
      expect(result).toEqual(mockRow);
    });

    it('returns null if record not found', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await repository.findByUserId('usr_123');
      expect(result).toBeNull();
    });
  });

  describe('upsertDefaults', () => {
    it('inserts default preferences on conflict returning created record', async () => {
      const mockCreated = { userId: 'usr_123', theme: 'system', itemsPerPage: 20 };
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockCreated]),
          }),
        }),
      });

      const result = await repository.upsertDefaults('usr_123');
      expect(result).toEqual(mockCreated);
    });
  });

  describe('upsertPreferences', () => {
    it('upserts preferences with provided payload returning updated record', async () => {
      const mockUpdated = { userId: 'usr_123', theme: 'dark', itemsPerPage: 30 };
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUpdated]),
          }),
        }),
      });

      const result = await repository.upsertPreferences(
        'usr_123',
        { theme: 'dark', itemsPerPage: 30 },
        { theme: 'dark', itemsPerPage: 30, updatedAt: new Date() },
      );
      expect(result).toEqual(mockUpdated);
    });
  });
});

