import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { db } from '@locus/database';
import type { User } from '../auth/auth.js';
import { PreferencesService } from './preferences.service.js';
import { PreferencesController } from './preferences.controller.js';

describe('PreferencesService & PreferencesController', () => {
  let service: PreferencesService;
  let controller: PreferencesController;

  const mockUser: User = {
    id: 'usr_pref_123',
    email: 'user@example.com',
    name: 'Utpal',
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    service = new PreferencesService();
    controller = new PreferencesController(service);
    vi.restoreAllMocks();
  });

  describe('getPreferences', () => {
    it('returns existing preferences when present in database', async () => {
      const mockExisting = {
        userId: 'usr_pref_123',
        theme: 'dark',
        defaultFeed: 'following',
        feedMode: 'tagged_only',
        hideWatchedVideos: false,
        refreshIntervalMinutes: 60,
        itemsPerPage: 40,
        onboardingCompletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockExisting]),
          }),
        }),
      } as any);

      const result = await service.getPreferences('usr_pref_123');
      expect(result.userId).toBe('usr_pref_123');
      expect(result.theme).toBe('dark');
      expect(result.feedMode).toBe('tagged_only');
      expect(result.hideWatchedVideos).toBe(false);
      expect(result.itemsPerPage).toBe(40);
    });

    it('creates and returns default preferences when none exist', async () => {
      const mockCreated = {
        userId: 'usr_pref_123',
        theme: 'system',
        defaultFeed: 'unified',
        feedMode: 'normal',
        hideWatchedVideos: true,
        refreshIntervalMinutes: null,
        itemsPerPage: 20,
        onboardingCompletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockCreated]),
          }),
        }),
      } as any);

      const result = await service.getPreferences('usr_pref_123');
      expect(result.userId).toBe('usr_pref_123');
      expect(result.theme).toBe('system');
      expect(result.feedMode).toBe('normal');
      expect(result.hideWatchedVideos).toBe(true);
      expect(result.itemsPerPage).toBe(20);
    });
  });

  describe('updatePreferences', () => {
    it('updates specified preferences successfully', async () => {
      const mockUpdated = {
        userId: 'usr_pref_123',
        theme: 'light',
        defaultFeed: 'unified',
        hideWatchedVideos: false,
        refreshIntervalMinutes: 120,
        itemsPerPage: 50,
        onboardingCompletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUpdated]),
          }),
        }),
      } as any);

      const result = await service.updatePreferences('usr_pref_123', {
        theme: 'light',
        hideWatchedVideos: false,
        refreshIntervalMinutes: 120,
        itemsPerPage: 50,
      });

      expect(result.theme).toBe('light');
      expect(result.hideWatchedVideos).toBe(false);
      expect(result.refreshIntervalMinutes).toBe(120);
      expect(result.itemsPerPage).toBe(50);
    });

    it('rejects invalid preference values with VALIDATION_ERROR', async () => {
      await expect(
        service.updatePreferences('usr_pref_123', {
          theme: 'invalid-theme',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.updatePreferences('usr_pref_123', {
          feedMode: 'invalid-mode' as any,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.updatePreferences('usr_pref_123', {
          itemsPerPage: 5, // Minimum is 10
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('PreferencesController', () => {
    it('delegates getPreferences to service', async () => {
      const mockResult = {
        userId: 'usr_pref_123',
        theme: 'system' as const,
        defaultFeed: 'unified' as const,
        feedMode: 'normal' as const,
        hideWatchedVideos: true,
        refreshIntervalMinutes: null,
        itemsPerPage: 20,
      };

      const spy = vi
        .spyOn(service, 'getPreferences')
        .mockResolvedValue(mockResult);

      const result = await controller.getPreferences(mockUser);
      expect(spy).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockResult);
    });

    it('delegates updatePreferences to service', async () => {
      const mockResult = {
        userId: 'usr_pref_123',
        theme: 'dark' as const,
        defaultFeed: 'unified' as const,
        feedMode: 'normal' as const,
        hideWatchedVideos: false,
        refreshIntervalMinutes: null,
        itemsPerPage: 20,
      };

      const spy = vi
        .spyOn(service, 'updatePreferences')
        .mockResolvedValue(mockResult);

      const payload = { theme: 'dark' as const, hideWatchedVideos: false };
      const result = await controller.updatePreferences(mockUser, payload);
      expect(spy).toHaveBeenCalledWith(mockUser.id, payload);
      expect(result).toEqual(mockResult);
    });
  });
});
