import 'dotenv/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import type { User } from './auth/auth.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(() => {
    appController = new AppController(new AppService());
  });

  describe('root', () => {
    it('should return "Hello World!" when no error query param is present', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });

    it('should redirect to frontend login with error query param when error is present', () => {
      const mockReq = {
        query: { error: 'state_mismatch' },
      } as any;
      const redirectMock = vi.fn();
      const mockRes = {
        redirect: redirectMock,
      } as any;

      appController.getHello(mockReq, mockRes);
      expect(redirectMock).toHaveBeenCalledWith(
        expect.stringContaining('/login?error=state_mismatch'),
      );
    });
  });

  describe('me', () => {
    it('should return authenticated user profile', () => {
      const mockUser: User = {
        id: 'usr_123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = appController.getProfile(mockUser);
      expect(result).toEqual({
        authenticated: true,
        user: {
          id: 'usr_123',
          name: 'Test User',
          email: 'test@example.com',
          emailVerified: true,
          image: null,
        },
      });
    });
  });
});
