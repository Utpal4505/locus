export { z } from "zod";
export {
  apiErrorResponseSchema,
  createApiResponseSchema,
  apiErrorSchema,
} from "./common/api-response.schema";

export type {
  ApiErrorResponse,
  ApiResponse,
} from "./common/api-response.schema";

export {
  importedChannelSchema,
  channelListResponseSchema,
  subscriptionImportResponseSchema,
  followChannelResponseSchema,
  youtubeStatusResponseSchema,
  bulkFollowChannelRequestSchema,
  bulkFollowChannelResponseSchema,
} from "./youtube/channel.schema";

export type {
  ImportedChannel,
  ChannelListResponse,
  SubscriptionImportResponse,
  FollowChannelResponse,
  YoutubeStatusResponse,
  BulkFollowChannelRequest,
  BulkFollowChannelResponse,
} from "./youtube/channel.schema";

export {
  videoSyncResponseSchema,
  videoSyncOptionsSchema,
} from "./youtube/video-sync.schema";

export type {
  VideoSyncResponse,
  VideoSyncOptions,
} from "./youtube/video-sync.schema";

export {
  feedItemLibraryStateSchema,
  feedItemSchema,
  feedResponseSchema,
  feedQuerySchema,
  feedStatusSchema,
} from "./feed/feed.schema";

export type {
  FeedItemLibraryState,
  FeedItem,
  FeedResponse,
  FeedQuery,
  FeedStatus,
} from "./feed/feed.schema";

export {
  themeSchema,
  defaultFeedSchema,
  userPreferencesResponseSchema,
  updateUserPreferencesRequestSchema,
} from "./preferences/preferences.schema";

export type {
  Theme,
  DefaultFeed,
  UserPreferencesResponse,
  UpdateUserPreferencesRequest,
} from "./preferences/preferences.schema";

export {
  libraryTabSchema,
  historyStatusSchema,
  updateLibraryStateRequestSchema,
  libraryItemSchema,
  libraryListResponseSchema,
  updateLibraryStateResponseSchema,
  libraryNotesQuerySchema,
  libraryNoteItemSchema,
  libraryNotesResponseSchema,
} from "./library/library.schema";

export type {
  LibraryTab,
  HistoryStatus,
  UpdateLibraryStateRequest,
  LibraryItem,
  LibraryListResponse,
  UpdateLibraryStateResponse,
  LibraryNotesQuery,
  LibraryNoteItem,
  LibraryNotesResponse,
} from "./library/library.schema";

export {
  videoLibraryStateSchema,
  videoDetailResponseSchema,
  videoNoteResponseSchema,
  updateVideoNoteRequestSchema,
} from "./video/video.schema";

export type {
  VideoLibraryState,
  VideoDetailResponse,
  VideoNoteResponse,
  UpdateVideoNoteRequest,
} from "./video/video.schema";
