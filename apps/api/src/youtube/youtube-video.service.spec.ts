import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, videoLibrary } from "@locus/database";
import { encryptToken } from "../crypto/index.js";
import type { User } from "../auth/auth.js";
import {
  parseIsoDuration,
  YoutubeVideoService,
} from "./youtube-video.service.js";
import { YoutubeController } from "./youtube.controller.js";

const TEST_KEY = crypto.randomBytes(32).toString("hex");

describe("YoutubeVideoService & Video Sync Controller", () => {
  let service: YoutubeVideoService;
  let controller: YoutubeController;

  const originalEnv = { ...process.env };

  const mockUser: User = {
    id: "usr_sync_user",
    email: "sync@example.com",
    name: "Sync User",
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

    service = new YoutubeVideoService();
    controller = new YoutubeController({} as any, {} as any, {} as any, service);

    vi.restoreAllMocks();
  });

  describe("parseIsoDuration", () => {
    it("correctly parses standard hours, minutes, and seconds", () => {
      expect(parseIsoDuration("PT15M33S")).toBe(933);
      expect(parseIsoDuration("PT1H2M10S")).toBe(3730);
      expect(parseIsoDuration("PT1H")).toBe(3600);
      expect(parseIsoDuration("PT45S")).toBe(45);
      expect(parseIsoDuration("PT0S")).toBe(0);
    });

    it("correctly parses days and weeks", () => {
      expect(parseIsoDuration("P1D")).toBe(86400);
      expect(parseIsoDuration("P1DT2H3M4S")).toBe(93784);
      expect(parseIsoDuration("P1W")).toBe(604800);
    });

    it("returns null for invalid or null inputs", () => {
      expect(parseIsoDuration(null)).toBeNull();
      expect(parseIsoDuration(undefined)).toBeNull();
      expect(parseIsoDuration("")).toBeNull();
      expect(parseIsoDuration("invalid-duration")).toBeNull();
    });
  });

  describe("syncFollowedChannelVideos error and edge conditions", () => {
    it("throws BadRequestException with YOUTUBE_NOT_CONNECTED if user has no YouTube integration", async () => {
      vi.spyOn(db, "select").mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([]),
          }),
        }),
      } as any);

      await expect(
        service.syncFollowedChannelVideos("usr_sync_user"),
      ).rejects.toMatchObject({
        response: {
          code: "YOUTUBE_NOT_CONNECTED",
        },
        status: 400,
      });
    });

    it("throws UnauthorizedException with YOUTUBE_REAUTH_REQUIRED if token decryption fails", async () => {
      vi.spyOn(db, "select").mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([
              {
                status: "connected",
                encryptedAccessToken: "invalid_encrypted_data",
              },
            ]),
          }),
        }),
      } as any);

      await expect(
        service.syncFollowedChannelVideos("usr_sync_user"),
      ).rejects.toMatchObject({
        response: {
          code: "YOUTUBE_REAUTH_REQUIRED",
        },
        status: 401,
      });
    });

    it("returns empty summary immediately if user has no followed YouTube channels", async () => {
      const validToken = encryptToken("ya29.valid_token");
      const selectSpy = vi.spyOn(db, "select");

      // 1. Integration query
      selectSpy.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([
              {
                status: "connected",
                encryptedAccessToken: validToken,
              },
            ]),
          }),
        }),
      } as any);

      // 2. Followed channels query returns empty
      selectSpy.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          innerJoin: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockResolvedValueOnce([]),
          }),
        }),
      } as any);

      const result = await service.syncFollowedChannelVideos("usr_sync_user");
      expect(result).toEqual({
        channelsProcessed: 0,
        videosSynced: 0,
        itemsSkipped: 0,
        limitReached: false,
      });
    });

    it("throws UnauthorizedException with YOUTUBE_REAUTH_REQUIRED if YouTube API returns 401", async () => {
      const validToken = encryptToken("ya29.valid_token");
      const selectSpy = vi.spyOn(db, "select");

      // 1. Integration query
      selectSpy.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([
              {
                status: "connected",
                encryptedAccessToken: validToken,
              },
            ]),
          }),
        }),
      } as any);

      // 2. Followed channels query
      selectSpy.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          innerJoin: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockResolvedValueOnce([
              {
                id: "00000000-0000-0000-0000-000000000001",
                externalId: "UC_channel_1",
                name: "Channel One",
              },
            ]),
          }),
        }),
      } as any);

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        status: 401,
        ok: false,
      } as Response);

      await expect(
        service.syncFollowedChannelVideos("usr_sync_user"),
      ).rejects.toMatchObject({
        response: {
          code: "YOUTUBE_REAUTH_REQUIRED",
        },
        status: 401,
      });
    });

    it("throws 429 HttpException with YOUTUBE_API_ERROR if YouTube API quota is exceeded", async () => {
      const validToken = encryptToken("ya29.valid_token");
      const selectSpy = vi.spyOn(db, "select");

      // 1. Integration query
      selectSpy.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([
              {
                status: "connected",
                encryptedAccessToken: validToken,
              },
            ]),
          }),
        }),
      } as any);

      // 2. Followed channels query
      selectSpy.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          innerJoin: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockResolvedValueOnce([
              {
                id: "00000000-0000-0000-0000-000000000001",
                externalId: "UC_channel_1",
                name: "Channel One",
              },
            ]),
          }),
        }),
      } as any);

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        status: 403,
        ok: false,
        json: async () => ({
          error: {
            errors: [{ reason: "quotaExceeded" }],
          },
        }),
      } as Response);

      await expect(
        service.syncFollowedChannelVideos("usr_sync_user"),
      ).rejects.toMatchObject({
        response: {
          code: "YOUTUBE_API_ERROR",
        },
        status: 429,
      });
    });
  });

  describe("successful video ingestion, enrichment, ordering, and upserting", () => {
    it("resolves uploads playlist, fetches playlistItems, enriches with videos.list, orders by publishedAt, and upserts into videos without creating video_library state", async () => {
      const validToken = encryptToken("ya29.valid_token");
      const selectSpy = vi.spyOn(db, "select");

      // 1. Integration query
      selectSpy.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([
              {
                status: "connected",
                encryptedAccessToken: validToken,
              },
            ]),
          }),
        }),
      } as any);

      // 2. Followed channels query
      selectSpy.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          innerJoin: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockResolvedValueOnce([
              {
                id: "00000000-0000-0000-0000-000000000001",
                externalId: "UC_chan_alpha",
                name: "Channel Alpha",
              },
            ]),
          }),
        }),
      } as any);

      // 3. Mock fetch calls:
      // Call 1: channels.list (uploads playlist resolution)
      // Call 2: playlistItems.list
      // Call 3: videos.list (enrichment)
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      // channels.list response
      fetchSpy.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          items: [
            {
              id: "UC_chan_alpha",
              contentDetails: {
                relatedPlaylists: {
                  uploads: "UU_chan_alpha",
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
                title: "Older Video",
                description: "Older description",
                publishedAt: "2026-10-01T10:00:00Z",
                thumbnails: { high: { url: "https://thumb/older.jpg" } },
                resourceId: { videoId: "vid_older" },
              },
              contentDetails: {
                videoId: "vid_older",
                videoPublishedAt: "2026-10-01T10:00:00Z",
              },
            },
            {
              // Deleted / Private video item to skip
              snippet: {
                title: "Deleted video",
                resourceId: { videoId: "vid_deleted" },
              },
            },
            {
              snippet: {
                title: "Newer Video",
                description: "Newer description",
                publishedAt: "2026-10-15T15:00:00Z",
                thumbnails: { high: { url: "https://thumb/newer.jpg" } },
                resourceId: { videoId: "vid_newer" },
              },
              contentDetails: {
                videoId: "vid_newer",
                videoPublishedAt: "2026-10-15T15:00:00Z",
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
              id: "vid_older",
              snippet: {
                title: "Older Video (Enriched)",
                description: "Older description",
                publishedAt: "2026-10-01T10:00:00Z",
                thumbnails: { maxres: { url: "https://thumb/older-maxres.jpg" } },
              },
              contentDetails: {
                duration: "PT10M15S", // 615 seconds
              },
            },
            {
              id: "vid_newer",
              snippet: {
                title: "Newer Video (Enriched)",
                description: "Newer description",
                publishedAt: "2026-10-15T15:00:00Z",
                thumbnails: { maxres: { url: "https://thumb/newer-maxres.jpg" } },
              },
              contentDetails: {
                duration: "PT1H5M", // 3900 seconds
              },
            },
          ],
        }),
      } as Response);

      // 4. Mock db.insert for videos
      const insertedVideos: any[] = [];
      const insertSpy = vi.spyOn(db, "insert");
      insertSpy.mockImplementation((targetTable: any) => {
        // Assert that videoLibrary is NEVER inserted into
        expect(targetTable).not.toBe(videoLibrary);

        return {
          values: vi.fn().mockImplementation((val) => {
            insertedVideos.push(val);
            return {
              onConflictDoUpdate: vi.fn().mockResolvedValue([]),
              onConflictDoNothing: vi.fn().mockResolvedValue([]),
            };
          }),
        } as any;
      });

      // 5. Mock db.update for sources
      const updateSpy = vi.spyOn(db, "update");
      updateSpy.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await service.syncFollowedChannelVideos("usr_sync_user");

      expect(result).toEqual({
        channelsProcessed: 1,
        videosSynced: 2,
        itemsSkipped: 1, // Deleted video was skipped
        limitReached: false,
      });

      // Verify videos were inserted in publication timestamp descending order (newer first)
      expect(insertedVideos).toHaveLength(2);
      expect(insertedVideos[0].youtubeVideoId).toBe("vid_newer");
      expect(insertedVideos[0].title).toBe("Newer Video (Enriched)");
      expect(insertedVideos[0].durationSeconds).toBe(3900);
      expect(insertedVideos[0].thumbnailUrl).toBe("https://thumb/newer-maxres.jpg");
      expect(insertedVideos[0].url).toBe("https://www.youtube.com/watch?v=vid_newer");

      expect(insertedVideos[1].youtubeVideoId).toBe("vid_older");
      expect(insertedVideos[1].title).toBe("Older Video (Enriched)");
      expect(insertedVideos[1].durationSeconds).toBe(615);
      expect(insertedVideos[1].thumbnailUrl).toBe("https://thumb/older-maxres.jpg");
    });

    it("handles multiple channels, detects limit reached, and isolates partial channel failure", async () => {
      const validToken = encryptToken("ya29.valid_token");
      const selectSpy = vi.spyOn(db, "select");

      // 1. Integration query
      selectSpy.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([
              {
                status: "connected",
                encryptedAccessToken: validToken,
              },
            ]),
          }),
        }),
      } as any);

      // 2. Followed channels query: 2 channels
      selectSpy.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          innerJoin: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockResolvedValueOnce([
              {
                id: "00000000-0000-0000-0000-000000000001",
                externalId: "UC_chan_ok",
                name: "Channel OK",
              },
              {
                id: "00000000-0000-0000-0000-000000000002",
                externalId: "UC_chan_fail",
                name: "Channel Broken",
              },
            ]),
          }),
        }),
      } as any);

      const fetchSpy = vi.spyOn(globalThis, "fetch");

      // channels.list (returns upload playlist for UC_chan_ok, relies on UU fallback for UC_chan_fail)
      fetchSpy.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          items: [
            {
              id: "UC_chan_ok",
              contentDetails: {
                relatedPlaylists: {
                  uploads: "UU_chan_ok",
                },
              },
            },
          ],
        }),
      } as Response);

      // playlistItems.list for Channel OK: returns 2 items and a nextPageToken (indicating limit reached for maxResults=2)
      fetchSpy.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          nextPageToken: "next_page_token_exists",
          items: [
            {
              snippet: {
                title: "Channel OK Video 1",
                publishedAt: "2026-10-16T12:00:00Z",
                resourceId: { videoId: "vid_ok_1" },
              },
            },
            {
              snippet: {
                title: "Channel OK Video 2",
                publishedAt: "2026-10-15T12:00:00Z",
                resourceId: { videoId: "vid_ok_2" },
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
              id: "vid_ok_1",
              snippet: { title: "Channel OK Video 1", publishedAt: "2026-10-16T12:00:00Z" },
              contentDetails: { duration: "PT5M" },
            },
            {
              id: "vid_ok_2",
              snippet: { title: "Channel OK Video 2", publishedAt: "2026-10-15T12:00:00Z" },
              contentDetails: { duration: "PT8M" },
            },
          ],
        }),
      } as Response);

      // playlistItems.list for Channel Broken: returns 404 (e.g. playlist removed on YouTube)
      fetchSpy.mockResolvedValueOnce({
        status: 404,
        ok: false,
      } as Response);

      // Mock db.insert
      vi.spyOn(db, "insert").mockImplementation(() => {
        return {
          values: vi.fn().mockReturnValue({
            onConflictDoUpdate: vi.fn().mockResolvedValue([]),
          }),
        } as any;
      });

      // Mock db.update
      vi.spyOn(db, "update").mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await service.syncFollowedChannelVideos("usr_sync_user", {
        maxResultsPerChannel: 2,
      });

      expect(result.channelsProcessed).toBe(1); // 1 succeeded, 1 skipped/failed
      expect(result.videosSynced).toBe(2);
      expect(result.limitReached).toBe(true); // Hit limit of 2 with nextPageToken present
    });
  });

  describe("YoutubeController syncVideos delegation", () => {
    it("delegates syncVideos from query parameter and body to service", async () => {
      const spy = vi
        .spyOn(service, "syncFollowedChannelVideos")
        .mockResolvedValueOnce({
          channelsProcessed: 2,
          videosSynced: 10,
          itemsSkipped: 0,
          limitReached: false,
        });

      const res = await controller.syncVideos(mockUser, "25", undefined);
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

