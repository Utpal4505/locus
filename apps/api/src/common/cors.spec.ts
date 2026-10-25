import { describe, expect, it } from 'vitest';
import { isAllowedOrigin, parseOrigins, getTrustedOrigins } from './cors.js';

describe('CORS Utility', () => {
  describe('parseOrigins', () => {
    it('should parse single URL and strip trailing slashes', () => {
      expect(parseOrigins('http://localhost:3000/')).toEqual([
        'http://localhost:3000',
      ]);
    });

    it('should parse multiple comma-separated URLs and trim whitespace', () => {
      expect(
        parseOrigins(
          'http://localhost:3000/, https://locus.teampoint.online/ , http://localhost:3001',
        ),
      ).toEqual([
        'http://localhost:3000',
        'https://locus.teampoint.online',
        'http://localhost:3001',
      ]);
    });

    it('should return empty array for undefined or empty input', () => {
      expect(parseOrigins(undefined)).toEqual([]);
      expect(parseOrigins('')).toEqual([]);
    });
  });

  describe('isAllowedOrigin', () => {
    it('should allow undefined origin (same-origin, curl, mobile)', () => {
      expect(isAllowedOrigin(undefined)).toBe(true);
    });

    it('should allow standard development localhost ports', () => {
      expect(isAllowedOrigin('http://localhost:3000')).toBe(true);
      expect(isAllowedOrigin('http://localhost:3000/')).toBe(true);
      expect(isAllowedOrigin('http://localhost:3001')).toBe(true);
      expect(isAllowedOrigin('http://127.0.0.1:3000')).toBe(true);
      expect(isAllowedOrigin('http://127.0.0.1:3001')).toBe(true);
    });

    it('should allow production Locus domains', () => {
      expect(isAllowedOrigin('https://locus.teampoint.online')).toBe(true);
      expect(isAllowedOrigin('https://www.locus.teampoint.online')).toBe(true);
    });

    it('should allow onrender and vercel preview domains', () => {
      expect(isAllowedOrigin('https://locus-api-40ib.onrender.com')).toBe(true);
      expect(isAllowedOrigin('https://locus-preview-123.vercel.app')).toBe(true);
    });

    it('should reject unauthorized origins', () => {
      expect(isAllowedOrigin('https://malicious-site.com')).toBe(false);
      expect(isAllowedOrigin('http://untrusted.org')).toBe(false);
      expect(isAllowedOrigin('https://fake-teampoint.online.attacker.com')).toBe(
        false,
      );
    });
  });
});
