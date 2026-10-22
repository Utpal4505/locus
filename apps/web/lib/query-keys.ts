/**
 * Canonical query key factory for Locus TanStack Query cache.
 * Organized hierarchically so cache invalidations can target either specific
 * granular queries or broad domain groups (e.g. invalidating all feed queries).
 */
export const queryKeys = {
  feed: {
    all: () => ["feed"] as const,
    list: (limit = 20, cursor?: string) =>
      ["feed", "list", { limit, cursor: cursor ?? null }] as const,
    infinite: (limit = 20) => ["feed", "infinite", { limit }] as const,
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
} as const;
