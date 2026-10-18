export interface YoutubeOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  frontendUrl: string;
}

/**
 * Resolves and validates YouTube OAuth configuration from environment variables.
 * Allows falling back to GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET if dedicated
 * YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET variables are not explicitly set.
 */
export function resolveYoutubeOAuthConfig(): YoutubeOAuthConfig | null {
  const clientId =
    process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret =
    process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.YOUTUBE_REDIRECT_URI ||
    'http://localhost:3002/api/youtube/callback';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId: clientId.trim(),
    clientSecret: clientSecret.trim(),
    redirectUri: redirectUri.trim(),
    frontendUrl: frontendUrl.trim(),
  };
}
