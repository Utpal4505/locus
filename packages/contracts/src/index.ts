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
  videoSyncRequestSchema,
  syncStatusResponseSchema,
  syncTriggerEnum,
  syncStatusStateEnum,
} from "./youtube/video-sync.schema";

export type {
  VideoSyncResponse,
  VideoSyncOptions,
  VideoSyncRequest,
  SyncStatusResponse,
  SyncTrigger,
  SyncStatusState,
} from "./youtube/video-sync.schema";

export {
  feedItemLibraryStateSchema,
  feedItemSchema,
  feedResponseSchema,
  feedQuerySchema,
  feedStatusSchema,
  feedModeFilterSchema,
  topicTagSchema,
} from "./feed/feed.schema";

export type {
  FeedItemLibraryState,
  FeedItem,
  FeedResponse,
  FeedQuery,
  FeedStatus,
  FeedModeFilter,
  TopicTag,
} from "./feed/feed.schema";

export {
  themeSchema,
  defaultFeedSchema,
  feedModeSchema,
  userPreferencesResponseSchema,
  updateUserPreferencesRequestSchema,
} from "./preferences/preferences.schema";

export type {
  Theme,
  DefaultFeed,
  FeedMode,
  UserPreferencesResponse,
  UpdateUserPreferencesRequest,
} from "./preferences/preferences.schema";

export * from "./classification/index";

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

export {
  globalSearchVideoItemSchema,
  globalSearchNoteItemSchema,
  globalSearchChannelItemSchema,
  globalSearchResponseSchema,
} from "./search/search.schema";

export type {
  GlobalSearchVideoItem,
  GlobalSearchNoteItem,
  GlobalSearchChannelItem,
  GlobalSearchResponse,
} from "./search/search.schema";

export {
  feedbackTypeEnumSchema,
  feedbackStatusEnumSchema,
  feedbackPriorityEnumSchema,
  createFeedbackSchema,
  feedbackItemSchema,
  adminFeedbackQuerySchema,
  adminUpdateFeedbackSchema,
  feedbackListResponseSchema,
  feedbackStatsResponseSchema,
} from "./feedback/feedback.schema";

export type {
  FeedbackTypeContract,
  FeedbackStatusContract,
  FeedbackPriorityContract,
  CreateFeedbackInput,
  FeedbackItem,
  AdminFeedbackQuery,
  AdminFeedbackQueryInput,
  AdminUpdateFeedbackInput,
  FeedbackListResponse,
  FeedbackStatsResponse,
} from "./feedback/feedback.schema";

export { adminMetricsResponseSchema } from "./admin/admin-metrics.schema";
export type { AdminMetricsResponse } from "./admin/admin-metrics.schema";

