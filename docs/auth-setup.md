# Locus Authentication Setup Guide

This document outlines the authentication architecture for Locus, configuration instructions for Nodemailer SMTP and OAuth providers, and verification procedures.

---

## 1. Architecture Overview

Locus uses a decoupled full-stack architecture where **NestJS is the sole backend API server** and **Next.js remains a pure frontend application**:

```mermaid
flowchart LR
    subgraph Frontend ["Next.js (apps/web) :3000"]
      AuthClient["Better Auth Client (lib/auth-client.ts)"]
      AuthUI["Auth Dashboard (app/auth-dashboard.tsx)"]
    end

    subgraph Backend ["NestJS (apps/api) :3002"]
      AuthController["AuthController (/api/auth/*)"]
      BetterAuth["Better Auth Server Engine"]
      EmailService["EmailService (Nodemailer SMTP)"]
      AuthGuard["AuthGuard & @CurrentUser()"]
      ProtectedRoutes["Protected Routes (e.g. GET /me)"]
    end

    subgraph Database ["PostgreSQL (packages/database)"]
      Drizzle["Drizzle ORM Tables (user, session, account, verification)"]
    end

    AuthClient -- "fetch (credentials: include)" --> AuthController
    AuthController --> BetterAuth
    BetterAuth --> EmailService
    BetterAuth --> Drizzle
    AuthGuard --> BetterAuth
    ProtectedRoutes --> AuthGuard
```

- **`apps/api` (NestJS on port 3002)**:
  - Owns the Better Auth server instance and mounts endpoints at `/api/auth/*`.
  - Disables the global body parser (`bodyParser: false`) so incoming request streams are preserved for Better Auth, while selectively applying JSON parsing to all other application routes.
  - Owns email delivery using **Nodemailer with SMTP** for verification and password-reset emails.
  - Owns session validation with `AuthGuard` and `@CurrentUser()` parameter decorator.
  - Exposes protected endpoints (e.g., `GET /me`) that return `401 Unauthorized` without a valid session.
  - Configures CORS with `credentials: true` and trusted origins (`http://localhost:3000`, `http://127.0.0.1:3000`).

- **`apps/web` (Next.js on port 3000)**:
  - Contains zero API routes (`apps/web/app/api` has been completely eliminated).
  - Uses `better-auth/react` client pointing directly to `http://localhost:3002/api/auth` with `credentials: "include"`.
  - Provides user-facing auth UI (`apps/web/app/auth-dashboard.tsx`) for sign-up, sign-in, password reset, session status, and testing protected backend endpoints.

- **`packages/database`**:
  - Contains Drizzle ORM schema definitions and migrations for `user`, `session`, `account`, `verification`, and application tables (`preferences`, `sources`, `topics`, `video_library`, `videos`).
  - All foreign keys cascadingly reference `user.id`.

- **`packages/auth`**:
  - Removed. No separate auth package is needed as server authentication lives directly in `apps/api`.

---

## 2. Environment Variables

### Backend (`apps/api/.env`)

```env
PORT=3002
DATABASE_URL=postgresql://postgres:password@localhost:5432/locus
BETTER_AUTH_SECRET=locus_dev_secret_key_needs_to_be_at_least_32_characters_long
BETTER_AUTH_URL=http://localhost:3002
FRONTEND_URL=http://localhost:3000

# Nodemailer SMTP Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_FROM=Locus <noreply@locus.dev>

# OAuth Providers (Optional in local development)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

### Frontend (`apps/web/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

---

## 3. Email Delivery (Nodemailer SMTP)

Locus uses **Nodemailer with SMTP only** for all transactional authentication emails.

### SMTP Settings & Port Guide

- **Port 465**: Set `SMTP_SECURE=true` (uses implicit TLS).
- **Port 587**: Set `SMTP_SECURE=false` (uses opportunistic TLS / STARTTLS).
- **Port 2525 / 25**: Set `SMTP_SECURE=false`.

### Development & Sandbox Fallback

When `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS` are not provided in development:
1. `EmailService` automatically provisions an **Ethereal test SMTP account** (`smtp.ethereal.email`).
2. Verification and reset emails are sent via real SMTP to Ethereal.
3. Message preview URLs (e.g., `https://ethereal.email/message/...`) are logged to the console for testing.
4. In production (`NODE_ENV=production`), missing SMTP credentials throw an explicit startup error.

---

## 4. OAuth Configuration

Locus conditionally enables Google and GitHub OAuth:

### Google OAuth
1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Configure OAuth Consent Screen.
3. Create Credentials -> OAuth client ID -> Web application:
   - Authorized redirect URIs: `http://localhost:3002/api/auth/callback/google`
4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `apps/api/.env`.

### GitHub OAuth
1. Go to GitHub Settings -> Developer settings -> OAuth Apps.
2. Register a new OAuth application:
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3002/api/auth/callback/github`
3. Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `apps/api/.env`.

*Note: If OAuth credentials are not provided, email/password authentication remains 100% operational, and the frontend displays clear feedback indicating the provider is not configured.*

---

## 5. Verification & Testing

Run unit tests and end-to-end integration tests:

```bash
# Run NestJS unit tests (includes EmailService formatting and AppController)
pnpm --filter api test

# Run NestJS E2E integration tests (tests Better Auth endpoints, signup, session, /me, signout)
pnpm --filter api test:e2e

# Run monorepo type checking
pnpm exec turbo run check-types

# Build web and api applications
pnpm --filter api build
pnpm --filter web build
```

