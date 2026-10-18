import crypto from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@locus/database';
import { decryptToken } from '../crypto/index.js';
import { auth, type User } from '../auth/auth.js';
import { OAuthStateService } from './oauth-state.service.js';
import { YoutubeOAuthService } from './youtube-oauth.service.js';
import { YoutubeController } from './youtube.controller.js';

// Mock encryption key for tests
const TEST_KEY = crypto.randomBytes(32).toString('hex');

describe('YoutubeOAuthService & YoutubeController', () => {
  let stateService: OAuthStateService;
  let oauthService: YoutubeOAuthService;
  let controller: YoutubeController;

  const originalEnv = { ...process.env };

  const mockUser: User = {
    id: 'usr_test_123',
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      TOKEN_ENCRYPTION_KEY: TEST_KEY,
      YOUTUBE_CLIENT_ID: 'mock-client-id.apps.googleusercontent.com',
      YOUTUBE_CLIENT_SECRET: 'mock-client-secret',
      YOUTUBE_REDIRECT_URI: 'http://localhost:3002/api/youtube/callback',
      FRONTEND_URL: 'http://localhost:3000',
    };

    stateService = new OAuthStateService();
    oauthService = new YoutubeOAuthService(stateService);
    controller = new YoutubeController(
      oauthService,
      stateService,
      {} as any,
      {} as any,
    );

    vi.restoreAllMocks();
  });

  describe('Configuration & URL Construction', () => {
    it('throws error when YouTube OAuth configuration is missing', async () => {
      delete process.env.YOUTUBE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_ID;

      await expect(oauthService.generateAuthUrl('user_123')).rejects.toThrow(
        /YouTube OAuth is not configured/,
      );
    });

    it('constructs valid Google authorization URL with exact scopes and offline access', async () => {
      const authUrlString = await oauthService.generateAuthUrl('user_123');
      const authUrl = new URL(authUrlString);

      expect(authUrl.origin).toBe('https://accounts.google.com');
      expect(authUrl.pathname).toBe('/o/oauth2/v2/auth');
      expect(authUrl.searchParams.get('client_id')).toBe(
        'mock-client-id.apps.googleusercontent.com',
      );
      expect(authUrl.searchParams.get('redirect_uri')).toBe(
        'http://localhost:3002/api/youtube/callback',
      );
      expect(authUrl.searchParams.get('response_type')).toBe('code');
      expect(authUrl.searchParams.get('scope')).toBe(
        'https://www.googleapis.com/auth/youtube.readonly',
      );
      expect(authUrl.searchParams.get('access_type')).toBe('offline');
      expect(authUrl.searchParams.get('prompt')).toBe('consent');
      expect(authUrl.searchParams.get('include_granted_scopes')).toBe('true');

      const state = authUrl.searchParams.get('state');
      expect(state).toBeDefined();
      expect(state?.length).toBe(64);
    });
  });

  describe('Token Exchange', () => {
    it('successfully exchanges authorization code for Google tokens', async () => {
      const mockTokens = {
        access_token: 'ya29.mock_access_token',
        refresh_token: '1//mock_refresh_token',
        expires_in: 3600,
        scope: 'https://www.googleapis.com/auth/youtube.readonly',
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens,
      } as Response);

      const tokens = await oauthService.exchangeCodeForTokens('mock_auth_code');
      expect(tokens.access_token).toBe('ya29.mock_access_token');
      expect(tokens.refresh_token).toBe('1//mock_refresh_token');
      expect(tokens.expires_in).toBe(3600);
    });

    it('throws when Google token endpoint returns HTTP error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      } as Response);

      await expect(
        oauthService.exchangeCodeForTokens('invalid_code'),
      ).rejects.toThrow('Failed to exchange authorization code with Google.');
    });
  });

  describe('Channel Identity Resolution', () => {
    it('resolves channel identity when user has an active YouTube channel', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'UC_mock_channel_id_123',
              snippet: { title: 'Tech Channel' },
            },
          ],
        }),
      } as Response);

      const identity = await oauthService.resolveChannelIdentity('mock_token');
      expect(identity).toBeDefined();
      expect(identity?.channelId).toBe('UC_mock_channel_id_123');
      expect(identity?.title).toBe('Tech Channel');
    });

    it('returns null when user has no active YouTube channel', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [],
        }),
      } as Response);

      const identity = await oauthService.resolveChannelIdentity('mock_token');
      expect(identity).toBeNull();
    });

    it('throws when YouTube API query fails', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 403,
      } as Response);

      await expect(
        oauthService.resolveChannelIdentity('mock_token'),
      ).rejects.toThrow('Failed to query YouTube channels API.');
    });
  });

  describe('Token Encryption and Database Persistence', () => {
    it('encrypts tokens before database insertion and preserves existing refresh token on reconnection', async () => {
      let insertedValues: any = null;

      vi.spyOn(db, 'select').mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([
              {
                encryptedRefreshToken: 'v1:existing_encrypted_refresh_token',
              },
            ]),
          }),
        }),
      } as any);

      vi.spyOn(db, 'insert').mockReturnValueOnce({
        values: vi.fn().mockImplementation((val) => {
          insertedValues = val;
          return {
            onConflictDoUpdate: vi.fn().mockReturnValueOnce({
              returning: vi.fn().mockResolvedValueOnce([
                {
                  id: 'mock_uuid',
                  ...val,
                },
              ]),
            }),
          };
        }),
      } as any);

      // Reconnection token response that omits refresh_token
      const tokensWithoutRefreshToken = {
        access_token: 'ya29.new_access_token_value',
        expires_in: 3600,
        scope: 'https://www.googleapis.com/auth/youtube.readonly',
      };

      const saved = await oauthService.saveIntegration(
        'user_123',
        tokensWithoutRefreshToken,
        'UC_channel_123',
      );

      expect(saved).toBeDefined();
      expect(insertedValues).toBeDefined();

      // Access token must be encrypted
      expect(insertedValues.encryptedAccessToken.startsWith('v1:')).toBe(true);
      expect(insertedValues.encryptedAccessToken).not.toBe(
        'ya29.new_access_token_value',
      );
      expect(decryptToken(insertedValues.encryptedAccessToken)).toBe(
        'ya29.new_access_token_value',
      );

      // Existing refresh token must be preserved
      expect(insertedValues.encryptedRefreshToken).toBe(
        'v1:existing_encrypted_refresh_token',
      );
      expect(insertedValues.status).toBe('connected');
      expect(insertedValues.externalAccountId).toBe('UC_channel_123');
    });
  });

  describe('YoutubeController Endpoints', () => {
    it('connect: returns authorization URL as JSON by default', async () => {
      const mockRes = {
        json: vi.fn(),
        redirect: vi.fn(),
      } as any;

      await controller.connect(mockUser, mockRes);
      expect(mockRes.json).toHaveBeenCalledTimes(1);
      const callArg = mockRes.json.mock.calls[0][0];
      expect(callArg.url).toContain(
        'https://accounts.google.com/o/oauth2/v2/auth',
      );
      expect(callArg.url).toContain('client_id=');
    });

    it('connect: redirects to Google when ?redirect=true is supplied', async () => {
      const mockRes = {
        json: vi.fn(),
        redirect: vi.fn(),
      } as any;

      await controller.connect(mockUser, mockRes, 'true');
      expect(mockRes.redirect).toHaveBeenCalledTimes(1);
      const redirectUrl = mockRes.redirect.mock.calls[0][0];
      expect(redirectUrl).toContain('https://accounts.google.com');
    });

    it('callback: redirects with access_denied when provider returns error', async () => {
      const mockReq = { headers: {} } as any;
      const mockRes = { redirect: vi.fn() } as any;

      const state = stateService.generateState(mockUser.id);
      await controller.callback(
        mockReq,
        mockRes,
        undefined,
        state,
        'access_denied',
      );

      expect(mockRes.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/settings?youtube_error=access_denied',
      );
      // State must be consumed to prevent replay
      expect(stateService.consumeState(state)).toBeNull();
    });

    it('callback: redirects with invalid_request when code or state is missing without calling token exchange', async () => {
      const mockReq = { headers: {} } as any;
      const mockRes = { redirect: vi.fn() } as any;
      const exchangeSpy = vi.spyOn(oauthService, 'exchangeCodeForTokens');

      await controller.callback(mockReq, mockRes, undefined, undefined);
      expect(mockRes.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/settings?youtube_error=invalid_request',
      );
      expect(exchangeSpy).not.toHaveBeenCalled();
    });

    it('callback: redirects with invalid_state when state is expired or replayed without calling token exchange', async () => {
      const mockReq = { headers: {} } as any;
      const mockRes = { redirect: vi.fn() } as any;
      const exchangeSpy = vi.spyOn(oauthService, 'exchangeCodeForTokens');

      await controller.callback(
        mockReq,
        mockRes,
        'mock_code',
        'invalid_or_replayed_state',
      );

      expect(mockRes.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/settings?youtube_error=invalid_state',
      );
      expect(exchangeSpy).not.toHaveBeenCalled();
    });

    it('callback: redirects with user_mismatch and skips token exchange if active session user does not match state user', async () => {
      const mockReq = { headers: { cookie: 'session=different_user' } } as any;
      const mockRes = { redirect: vi.fn() } as any;
      const exchangeSpy = vi.spyOn(oauthService, 'exchangeCodeForTokens');

      const state = stateService.generateState('user_A');

      vi.spyOn(auth.api, 'getSession').mockResolvedValueOnce({
        user: { id: 'user_B', email: 'userb@example.com' } as any,
        session: {} as any,
      });

      await controller.callback(mockReq, mockRes, 'auth_code', state);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/settings?youtube_error=user_mismatch',
      );
      expect(exchangeSpy).not.toHaveBeenCalled();
    });

    it('callback: handles concurrent callback attempts safely with at most one succeeding', async () => {
      const state = stateService.generateState(mockUser.id);
      const exchangeSpy = vi
        .spyOn(oauthService, 'exchangeCodeForTokens')
        .mockResolvedValue({
          access_token: 'mock_at',
          expires_in: 3600,
        });
      vi.spyOn(oauthService, 'resolveChannelIdentity').mockResolvedValue({
        channelId: 'UC_chan',
      });
      vi.spyOn(oauthService, 'saveIntegration').mockResolvedValue({} as any);

      const mockRes1 = { redirect: vi.fn() } as any;
      const mockRes2 = { redirect: vi.fn() } as any;

      await Promise.all([
        controller.callback({ headers: {} } as any, mockRes1, 'code_1', state),
        controller.callback({ headers: {} } as any, mockRes2, 'code_1', state),
      ]);

      const redirects = [
        mockRes1.redirect.mock.calls[0]?.[0],
        mockRes2.redirect.mock.calls[0]?.[0],
      ];

      expect(redirects).toContain(
        'http://localhost:3000/settings?youtube=connected',
      );
      expect(redirects).toContain(
        'http://localhost:3000/settings?youtube_error=invalid_state',
      );
      expect(exchangeSpy).toHaveBeenCalledTimes(1);
    });

    it('callback: ignores arbitrary redirect query parameters and sanitizes untrusted error strings', async () => {
      const mockReq = {
        headers: {},
        query: {
          redirect_uri: 'https://evil.com',
          returnUrl: 'https://evil.com',
        },
      } as any;
      const mockRes = { redirect: vi.fn() } as any;

      await controller.callback(
        mockReq,
        mockRes,
        undefined,
        undefined,
        "<script>alert('xss')</script>",
      );

      expect(mockRes.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/settings?youtube_error=oauth_denied',
      );
      expect(mockRes.redirect).not.toHaveBeenCalledWith(
        expect.stringContaining('evil.com'),
      );
      expect(mockRes.redirect).not.toHaveBeenCalledWith(
        expect.stringContaining('<script>'),
      );
    });

    it('callback: redirects with channel_not_found when account has no YouTube channel', async () => {
      const mockReq = { headers: {} } as any;
      const mockRes = { redirect: vi.fn() } as any;

      const state = stateService.generateState(mockUser.id);

      vi.spyOn(oauthService, 'exchangeCodeForTokens').mockResolvedValueOnce({
        access_token: 'mock_at',
        refresh_token: 'mock_rt',
      });

      vi.spyOn(oauthService, 'resolveChannelIdentity').mockResolvedValueOnce(
        null,
      );

      await controller.callback(mockReq, mockRes, 'mock_code', state);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/settings?youtube_error=channel_not_found',
      );
    });

    it('callback: redirects to settings with youtube=connected on successful connection', async () => {
      const mockReq = { headers: {} } as any;
      const mockRes = { redirect: vi.fn() } as any;

      const state = stateService.generateState(mockUser.id);

      vi.spyOn(oauthService, 'exchangeCodeForTokens').mockResolvedValueOnce({
        access_token: 'mock_at',
        refresh_token: 'mock_rt',
        expires_in: 3600,
      });

      vi.spyOn(oauthService, 'resolveChannelIdentity').mockResolvedValueOnce({
        channelId: 'UC_channel_valid',
        title: 'Creator Channel',
      });

      vi.spyOn(oauthService, 'saveIntegration').mockResolvedValueOnce({
        id: 'mock_uuid',
        userId: mockUser.id,
        provider: 'youtube',
        externalAccountId: 'UC_channel_valid',
        encryptedAccessToken: 'v1:mock_enc_at',
        encryptedRefreshToken: 'v1:mock_enc_rt',
        tokenExpiresAt: new Date(),
        scopes: 'https://www.googleapis.com/auth/youtube.readonly',
        status: 'connected',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await controller.callback(mockReq, mockRes, 'valid_code', state);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/settings?youtube=connected',
      );
    });

    it('status: returns connection status for authenticated user', async () => {
      vi.spyOn(oauthService, 'getIntegrationStatus').mockResolvedValueOnce({
        connected: true,
        status: 'connected',
        externalAccountId: 'UC_channel_valid',
        tokenExpiresAt: new Date(),
        scopes: 'https://www.googleapis.com/auth/youtube.readonly',
      });

      const result = await controller.getStatus(mockUser);
      expect(result.connected).toBe(true);
      expect(result.externalAccountId).toBe('UC_channel_valid');
      expect((result as any).encryptedAccessToken).toBeUndefined();
    });
  });
});
