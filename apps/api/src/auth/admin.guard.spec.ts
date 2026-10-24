import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException, type ExecutionContext } from '@nestjs/common';
import { AdminGuard } from './admin.guard.js';
import { auth } from './auth.js';

describe('AdminGuard', () => {
  let guard: AdminGuard;

  beforeEach(() => {
    guard = new AdminGuard();
    vi.restoreAllMocks();
    process.env.ADMIN_EMAILS = 'utpal@example.com, admin@locus.internal';
  });

  const createMockContext = (request: any): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
      }),
    }) as unknown as ExecutionContext;

  it('allows access when user is attached and email is in ADMIN_EMAILS', async () => {
    const request = {
      user: {
        id: 'usr_admin_1',
        email: 'utpal@example.com',
      },
    };

    const result = await guard.canActivate(createMockContext(request));
    expect(result).toBe(true);
  });

  it('handles case-insensitivity in email matching', async () => {
    const request = {
      user: {
        id: 'usr_admin_1',
        email: 'UTPAL@EXAMPLE.COM',
      },
    };

    const result = await guard.canActivate(createMockContext(request));
    expect(result).toBe(true);
  });

  it('throws NotFoundException when user is not in ADMIN_EMAILS', async () => {
    const request = {
      user: {
        id: 'usr_regular_2',
        email: 'regular_user@example.com',
      },
    };

    await expect(guard.canActivate(createMockContext(request))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('resolves session from auth if user is not attached to request', async () => {
    const request = {
      headers: { cookie: 'session_token=valid' },
    };

    vi.spyOn(auth.api, 'getSession').mockResolvedValue({
      user: {
        id: 'usr_admin_1',
        email: 'admin@locus.internal',
      },
      session: { id: 'sess_1' },
    } as any);

    const result = await guard.canActivate(createMockContext(request));
    expect(result).toBe(true);
    expect((request as any).user.email).toBe('admin@locus.internal');
  });

  it('throws NotFoundException when session is invalid or missing', async () => {
    const request = {
      headers: {},
    };

    vi.spyOn(auth.api, 'getSession').mockResolvedValue(null as any);

    await expect(guard.canActivate(createMockContext(request))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws NotFoundException if ADMIN_EMAILS is not defined', async () => {
    delete process.env.ADMIN_EMAILS;
    const request = {
      user: {
        id: 'usr_admin_1',
        email: 'utpal@example.com',
      },
    };

    await expect(guard.canActivate(createMockContext(request))).rejects.toThrow(
      NotFoundException,
    );
  });
});

