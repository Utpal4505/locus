import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private isTestAccount = false;

  private async getTransporter(): Promise<Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
    const secure =
      process.env.SMTP_SECURE === 'true' ||
      (process.env.SMTP_SECURE === undefined && port === 465);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });

      try {
        await this.transporter.verify();
        this.logger.log(
          `SMTP transporter verified for ${host}:${port} (secure: ${secure})`,
        );
      } catch (verifyErr) {
        this.logger.error(
          `Failed to verify SMTP transporter connection: ${(verifyErr as Error).message}`,
        );
      }

      return this.transporter;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Production email delivery requires SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS environment variables.',
      );
    }

    // In development or test without explicit SMTP credentials, provision an Ethereal test SMTP account
    this.logger.warn(
      'No production SMTP credentials found in environment. Creating Ethereal test SMTP transporter for development/testing...',
    );

    try {
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      this.isTestAccount = true;
      this.logger.log(
        `Ethereal test SMTP transporter ready with user: ${testAccount.user}`,
      );
      return this.transporter;
    } catch (testAccountErr) {
      this.logger.error(
        `Failed to create test SMTP transporter: ${(testAccountErr as Error).message}`,
      );
      throw new Error('SMTP service is unavailable.');
    }
  }

  async sendEmail(
    options: SendEmailOptions,
  ): Promise<{ messageId: string; previewUrl?: string | false }> {
    const transporter = await this.getTransporter();
    const from = process.env.SMTP_FROM ?? 'Locus <noreply@locus.dev>';

    try {
      const info = await transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      const previewUrl = this.isTestAccount
        ? nodemailer.getTestMessageUrl(info)
        : undefined;
      if (previewUrl) {
        this.logger.log(
          `Email sent to ${options.to}. Preview URL: ${previewUrl}`,
        );
      } else {
        this.logger.log(
          `Email sent to ${options.to}. MessageId: ${info.messageId}`,
        );
      }

      return {
        messageId: info.messageId,
        previewUrl,
      };
    } catch (err) {
      this.logger.error(
        `Failed to deliver email to ${options.to}: ${(err as Error).message}`,
      );
      throw new Error('Email delivery failed. Please try again later.');
    }
  }

  async sendVerificationEmail(data: {
    user: { email: string; name?: string | null };
    url: string;
    token: string;
  }): Promise<void> {
    const recipientName = data.user.name ?? 'there';
    const subject = 'Verify your email address - Locus';
    const text = `Hi ${recipientName},\n\nWelcome to Locus! Please verify your email address by clicking the link below:\n${data.url}\n\nIf you did not create an account, you can safely ignore this email.\n\n— The Locus Team`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
        <h2 style="color: #000; margin-bottom: 16px;">Welcome to Locus</h2>
        <p style="font-size: 15px; line-height: 1.5; color: #333;">Hi ${recipientName},</p>
        <p style="font-size: 15px; line-height: 1.5; color: #333;">Please verify your email address to complete your registration for Locus:</p>
        <div style="margin: 28px 0;">
          <a href="${data.url}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">Verify Email Address</a>
        </div>
        <p style="font-size: 13px; color: #666; line-height: 1.5;">Or copy and paste this URL into your browser:<br /><a href="${data.url}" style="color: #0066cc;">${data.url}</a></p>
        <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 24px 0;" />
        <p style="font-size: 12px; color: #999;">If you did not request this verification, you can safely ignore this email.</p>
      </div>
    `;

    await this.sendEmail({
      to: data.user.email,
      subject,
      text,
      html,
    });
  }

  async sendResetPasswordEmail(data: {
    user: { email: string; name?: string | null };
    url: string;
    token: string;
  }): Promise<void> {
    const recipientName = data.user.name ?? 'there';
    const subject = 'Reset your password - Locus';
    const text = `Hi ${recipientName},\n\nYou recently requested to reset your password for your Locus account. Click the link below to set a new password:\n${data.url}\n\nIf you did not request a password reset, please ignore this email or reach out to support.\n\n— The Locus Team`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
        <h2 style="color: #000; margin-bottom: 16px;">Reset Your Password</h2>
        <p style="font-size: 15px; line-height: 1.5; color: #333;">Hi ${recipientName},</p>
        <p style="font-size: 15px; line-height: 1.5; color: #333;">You requested to reset your password for Locus. Click the button below to choose a new password:</p>
        <div style="margin: 28px 0;">
          <a href="${data.url}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">Reset Password</a>
        </div>
        <p style="font-size: 13px; color: #666; line-height: 1.5;">Or copy and paste this URL into your browser:<br /><a href="${data.url}" style="color: #0066cc;">${data.url}</a></p>
        <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 24px 0;" />
        <p style="font-size: 12px; color: #999;">If you did not request a password reset, no action is needed. Your account remains secure.</p>
      </div>
    `;

    await this.sendEmail({
      to: data.user.email,
      subject,
      text,
      html,
    });
  }
}

export const emailService = new EmailService();
