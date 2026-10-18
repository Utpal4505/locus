# Locus Database Architecture & Schema Specification

This document details the PostgreSQL schema architecture for **Locus**, covering the implemented MVP schema, Better Auth integration requirements, and the planned roadmap for future schema additions.

---

## 1. Architecture Principles

1. **Separation of Content and User State**: Global content records (`sources`, `videos`) are shared across all users and deduplicated. Per-user state (`video_library`, `user_preferences`, `user_topics`, `source_subscriptions`) is stored in dedicated tables referencing the shared content and user identity.
2. **Dedicated Content Types**: Videos and future articles are maintained in separate, specialized tables rather than a polymorphic generic table.
3. **Shared Catalog**: `sources` serves as a unified catalog for YouTube channels and future news publishers.
4. **Normalized Taxonomy**: `topics` provides a unified taxonomy with dedicated junction tables (`video_topics`, `user_topics`).
5. **Centralized Authentication**: Built to integrate with **Better Auth**. User foreign keys consistently use `text` IDs matching Better Auth's user ID format.

---

## 2. Implemented MVP Schema

The MVP schema is located in `packages/database/src/schema/` and managed with Drizzle ORM.

### Enums

- **`theme`**: `'system'`, `'light'`, `'dark'`
- **`default_feed`**: `'unified'`, `'following'`, `'discover'`
- **`source_type`**: `'youtube_channel'`, `'news_publisher'`

### Tables & Entities

#### A. `user_preferences` (`src/schema/preferences.ts`)

Stores application settings per user.

- `user_id` (`text`, PK): Better Auth user ID.
- `theme` (`theme`, NOT NULL, default `'system'`).
- `default_feed` (`default_feed`, NOT NULL, default `'unified'`).
- `hide_watched_videos` (`boolean`, NOT NULL, default `true`).
- `refresh_interval_minutes` (`integer`, nullable): Automated refresh interval in minutes.
- `items_per_page` (`integer`, NOT NULL, default `20`).
- `onboarding_completed_at` (`timestamptz`, nullable).
- `feed_preferences` (`jsonb`, NOT NULL, default `{}`): Arbitrary feed tuning parameters.
- `created_at`, `updated_at` (`timestamptz`, NOT NULL, default `now()`).
- **Constraints**:
  - `CHECK ("items_per_page" > 0)`
  - `CHECK ("refresh_interval_minutes" IS NULL OR "refresh_interval_minutes" > 0)`

#### B. `sources` (`src/schema/sources.ts`)

Shared catalog of content providers (YouTube channels and future news publishers).

- `id` (`uuid`, PK, default `gen_random_uuid()`).
- `type` (`source_type`, NOT NULL).
- `external_id` (`text`, nullable): Provider-assigned identifier (e.g. YouTube channel ID).
- `name` (`text`, NOT NULL).
- `url` (`text`, NOT NULL): Canonical source URL.
- `description`, `image_url`, `feed_url` (`text`, nullable).
- `is_active` (`boolean`, NOT NULL, default `true`).
- `last_fetched_at` (`timestamptz`, nullable).
- `created_at`, `updated_at` (`timestamptz`, NOT NULL, default `now()`).
- **Indexes**:
  - Unique partial index: `(type, external_id) WHERE external_id IS NOT NULL`
  - Index: `(type, is_active)`

#### C. `source_subscriptions` (`src/schema/sources.ts`)

Tracks sources followed by a user in Locus.

- `user_id` (`text`, NOT NULL): Better Auth user ID.
- `source_id` (`uuid`, NOT NULL, FK to `sources.id` ON DELETE CASCADE).
- `created_at` (`timestamptz`, NOT NULL, default `now()`).
- **Constraints & Indexes**:
  - Composite PK: `(user_id, source_id)`
  - Reverse lookup index: `(source_id, user_id)`

#### D. `videos` (`src/schema/videos.ts`)

Global catalog of YouTube video metadata.

- `id` (`uuid`, PK, default `gen_random_uuid()`).
- `youtube_video_id` (`text`, NOT NULL, UNIQUE): Provider deduplication key.
- `source_id` (`uuid`, NOT NULL, FK to `sources.id` ON DELETE RESTRICT): Deliberate restriction prevents deleting sources that have existing content.
- `title` (`text`, NOT NULL).
- `description`, `thumbnail_url` (`text`, nullable).
- `duration_seconds` (`integer`, nullable).
- `published_at` (`timestamptz`, nullable).
- `url` (`text`, NOT NULL): Canonical YouTube video URL.
- `created_at`, `updated_at` (`timestamptz`, NOT NULL, default `now()`).
- **Constraints & Indexes**:
  - Unique index on `youtube_video_id`
  - Index on `(source_id, published_at DESC NULLS LAST)`
  - Check constraint: `CHECK ("duration_seconds" IS NULL OR "duration_seconds" >= 0)`

#### E. `topics` (`src/schema/topics.ts`)

Global taxonomy for topics and categories.

- `id` (`uuid`, PK, default `gen_random_uuid()`).
- `name` (`text`, NOT NULL).
- `slug` (`text`, NOT NULL, UNIQUE).
- `description` (`text`, nullable).
- `created_at`, `updated_at` (`timestamptz`, NOT NULL, default `now()`).
- **Indexes**: Unique index on `slug`

#### F. `video_topics` (`src/schema/topics.ts`)

Many-to-many junction between videos and topics.

- `video_id` (`uuid`, NOT NULL, FK to `videos.id` ON DELETE CASCADE).
- `topic_id` (`uuid`, NOT NULL, FK to `topics.id` ON DELETE CASCADE).
- `created_at` (`timestamptz`, NOT NULL, default `now()`).
- **Constraints & Indexes**:
  - Composite PK: `(video_id, topic_id)`
  - Index on `topic_id`

#### G. `user_topics` (`src/schema/topics.ts`)

User-selected topic interests (onboarding and preferences).

- `user_id` (`text`, NOT NULL): Better Auth user ID.
- `topic_id` (`uuid`, NOT NULL, FK to `topics.id` ON DELETE CASCADE).
- `created_at` (`timestamptz`, NOT NULL, default `now()`).
- **Constraints & Indexes**:
  - Composite PK: `(user_id, topic_id)`
  - Index on `(topic_id, user_id)`

#### H. `video_library` (`src/schema/video-library.ts`)

Stores user interaction state for videos (watch status, bookmarking, queue, playback progress).

- `id` (`uuid`, PK, default `gen_random_uuid()`).
- `user_id` (`text`, NOT NULL): Better Auth user ID.
- `video_id` (`uuid`, NOT NULL, FK to `videos.id` ON DELETE CASCADE).
- `is_watched` (`boolean`, NOT NULL, default `false`).
- `is_bookmarked` (`boolean`, NOT NULL, default `false`).
- `isInQueue` (`boolean`, NOT NULL, default `false`).
- `progress_seconds` (`integer`, NOT NULL, default `0`).
- `last_opened_at` (`timestamptz`, nullable).
- `watched_at` (`timestamptz`, nullable).
- `created_at`, `updated_at` (`timestamptz`, NOT NULL, default `now()`).
- **Constraints & Indexes**:
  - Unique index: `(user_id, video_id)`
  - Index: `(user_id, is_in_queue, updated_at DESC NULLS LAST)`
  - Index: `(user_id, is_bookmarked, updated_at DESC NULLS LAST)`
  - Index: `(user_id, last_opened_at DESC NULLS LAST)`
  - Check constraint: `CHECK ("progress_seconds" >= 0)`

---

## 3. Better Auth Integration Prerequisite

Better Auth is not yet installed in the monorepo.

- **Entities owned by Better Auth**: `user`, `session`, `account`, `verification`.
- **Database compatibility**: All user-referencing tables (`user_preferences`, `source_subscriptions`, `user_topics`, `video_library`) define `user_id` as `text`, directly matching Better Auth's standard `text("id")` user identifier.
- **Next steps for Auth**: When `@better-auth` is introduced, generate or mount its schema in `src/schema/auth.ts` and add foreign key constraints referencing `user.id`.

---

## 4. Future Schema Plan (Documented Only)

The following tables are planned for subsequent milestones and should not be implemented until their respective application workflows are built:

### A. News & Articles Module

- **`articles`**:
  - `id` (`uuid`, PK, default `gen_random_uuid()`)
  - `source_id` (`uuid`, NOT NULL, FK to `sources.id` ON DELETE RESTRICT)
  - `canonical_url` (`text`, NOT NULL, UNIQUE)
  - `title` (`text`, NOT NULL)
  - `summary`, `author`, `image_url` (`text`, nullable)
  - `published_at` (`timestamptz`, nullable)
  - `created_at`, `updated_at` (`timestamptz`, NOT NULL)
  - _Indexes_: `(source_id, published_at DESC)`
- **`article_topics`**:
  - Composite PK: `(article_id, topic_id)` with cascading foreign keys to `articles` and `topics`.
- **`article_library`**:
  - `id` (`uuid`, PK), `user_id` (`text`), `article_id` (`uuid`, FK to `articles.id` ON DELETE CASCADE)
  - `is_read`, `is_bookmarked` (`boolean`)
  - `last_opened_at`, `read_at` (`timestamptz`)
  - _Indexes_: Unique `(user_id, article_id)`, `(user_id, is_bookmarked, updated_at DESC)`, `(user_id, last_opened_at DESC)`

### B. Detailed Activity History (Append-Only Event Log)

- **`video_watch_history`**:
  - `id` (`uuid`, PK), `user_id` (`text`), `video_id` (`uuid`, FK to `videos.id` ON DELETE CASCADE)
  - `started_at`, `ended_at` (`timestamptz`), `progress_seconds` (`integer`)
  - `created_at` (`timestamptz`)
- **`article_read_history`**:
  - `id` (`uuid`, PK), `user_id` (`text`), `article_id` (`uuid`, FK to `articles.id` ON DELETE CASCADE)
  - `opened_at`, `completed_at` (`timestamptz`), `created_at` (`timestamptz`)

### C. Ingestion Tracking

- **`sync_runs`**:
  - `id` (`uuid`, PK), `source_id` (`uuid`, nullable, FK to `sources.id` ON DELETE SET NULL)
  - `provider` (`text`, NOT NULL): e.g. `'youtube'`, `'rss'`
  - `trigger` (`text`, NOT NULL): `'manual'`, `'scheduled'`
  - `status` (`text`, NOT NULL): `'pending'`, `'running'`, `'succeeded'`, `'partial'`, `'failed'`
  - `started_at`, `completed_at` (`timestamptz`)
  - `items_found`, `items_created`, `items_updated` (`integer`, default 0, CHECK >= 0)
  - `error_summary` (`text`, nullable, sanitized)
  - `created_at` (`timestamptz`)
  - _Indexes_: `(created_at DESC)`, `(status, created_at DESC)`, `(source_id, created_at DESC)`

### D. Integrations & External Accounts

- **`integrations`**:
  - `id` (`uuid`, PK), `user_id` (`text`), `provider` (`text`), `external_account_id` (`text`)
  - `display_name`, `status`, `scopes` (`text`)
  - `connected_at`, `last_synced_at`, `created_at`, `updated_at` (`timestamptz`)
  - _Note_: OAuth tokens must be stored using application-layer encryption or a secure vault, never in plaintext.

### E. Advanced Personalization & Interactions

- **`content_interactions`**:
  - `id` (`uuid`, PK), `user_id` (`text`), `interaction_type` (`text`: `'impression'`, `'click'`, `'dismiss'`)
  - `video_id` (`uuid`, nullable, FK to `videos.id`), `article_id` (`uuid`, nullable, FK to `articles.id`)
  - `created_at` (`timestamptz`)
  - _Constraint_: Exactly one of `video_id` or `article_id` must be non-null.

### F. In-App Notifications

- **`notifications`**:
  - `id` (`uuid`, PK), `user_id` (`text`), `type` (`text`), `title` (`text`), `body` (`text`)
  - `href` (`text`), `read_at` (`timestamptz`, nullable), `metadata` (`jsonb`), `created_at` (`timestamptz`)
