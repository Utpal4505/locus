/**
 * Canonical query key factory for Locus TanStack Query cache.
 * Organized hierarchically so cache invalidations can target either specific
 * granular queries or broad domain groups (e.g. invalidating all feed queries).
 */
export const queryKeys = {
  feed: {
    all: () => ["feed"] as const,
    list: (
      limit = 20,
      cursor?: string,
      status?: "unwatched" | "watched" | "all",
    ) =>
      [
        "feed",
        "list",
        { limit, cursor: cursor ?? null, status: status ?? "all" },
      ] as const,
    infinite: (limit = 20, status?: "unwatched" | "watched" | "all") =>
      ["feed", "infinite", { limit, status: status ?? "all" }] as const,
  },
  youtube: {
    all: () => ["youtube"] as const,
    status: () => ["youtube", "status"] as const,
    channels: () => ["youtube", "channels"] as const,
  },
  auth: {
    all: () => ["auth"] as const,
    providers: () => ["auth", "providers"] as const,
  },
  preferences: {
    all: () => ["preferences"] as const,
    current: () => ["preferences", "current"] as const,
  },
  library: {
    all: () => ["library"] as const,
    tab: (tab: "queue" | "favorites" | "history" | "notes", status?: string) =>
      ["library", "tab", tab, status ?? "all"] as const,
    notes: (search = "", channelId = "", page = 1) =>
      ["library", "notes", { search, channelId, page }] as const,
  },
  videos: {
    all: () => ["videos"] as const,
    detail: (id: string) => ["videos", "detail", id] as const,
    notes: (id: string) => ["videos", "notes", id] as const,
  },
} as const;
