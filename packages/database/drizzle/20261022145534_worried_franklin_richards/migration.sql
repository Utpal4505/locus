ALTER TABLE "video_library" RENAME COLUMN "is_bookmarked" TO "is_favorite";--> statement-breakpoint
ALTER INDEX "video_library_user_bookmark_idx" RENAME TO "video_library_user_favorite_idx";