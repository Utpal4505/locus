import 'dotenv/config';
import { describe, expect, it, vi } from 'vitest';
import { EmailService } from './email.service.js';

describe('EmailService', () => {
  it('should be defined', () => {
    const service = new EmailService();
    expect(service).toBeDefined();
  });

  it('should format and trigger verification emails with correct subject and URL', async () => {
    const service = new EmailService();
    const sendEmailSpy = vi.spyOn(service, 'sendEmail').mockResolvedValue({
      messageId: 'mock-msg-123',
      previewUrl: false,
    });

    await service.sendVerificationEmail({
      user: { email: 'alex@example.com', name: 'Alex' },
      url: 'http://localhost:3000/verify-email?token=xyz123',
      token: 'xyz123',
    });

    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    const callArgs = sendEmailSpy.mock.calls[0][0];
    expect(callArgs.to).toBe('alex@example.com');
    expect(callArgs.subject).toBe('Verify your email address - Locus');
    expect(callArgs.text).toContain('Alex');
    expect(callArgs.text).toContain(
      'http://localhost:3000/verify-email?token=xyz123',
    );
    expect(callArgs.html).toContain(
      'http://localhost:3000/verify-email?token=xyz123',
    );
  });

  it('should format and trigger password reset emails with correct subject and URL', async () => {
    const service = new EmailService();
    const sendEmailSpy = vi.spyOn(service, 'sendEmail').mockResolvedValue({
      messageId: 'mock-msg-456',
      previewUrl: false,
    });

    await service.sendResetPasswordEmail({
      user: { email: 'sam@example.com', name: 'Sam' },
      url: 'http://localhost:3000/reset-password?token=reset789',
      token: 'reset789',
    });

    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    const callArgs = sendEmailSpy.mock.calls[0][0];
    expect(callArgs.to).toBe('sam@example.com');
    expect(callArgs.subject).toBe('Reset your password - Locus');
    expect(callArgs.text).toContain('Sam');
    expect(callArgs.text).toContain(
      'http://localhost:3000/reset-password?token=reset789',
    );
    expect(callArgs.html).toContain(
      'http://localhost:3000/reset-password?token=reset789',
    );
  });
});
