/**
 * Splits comma-separated URLs, trims whitespace, and strips trailing slashes.
 */
export function parseOrigins(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

/**
 * Returns the comprehensive list of known trusted origins.
 */
export function getTrustedOrigins(): string[] {
  const envOrigins = [
    ...parseOrigins(process.env.FRONTEND_URL),
    ...parseOrigins(process.env.BETTER_AUTH_URL),
  ];

  return Array.from(
    new Set([
      ...envOrigins,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
      'http://localhost:*',
      'http://127.0.0.1:*',
      'https://locus.teampoint.online',
      'https://www.locus.teampoint.online',
      'https://*.teampoint.online',
      'https://*.onrender.com',
      'https://*.vercel.app',
    ]),
  );
}

/**
 * Validates whether an incoming HTTP Origin header is allowed.
 * Allows same-origin/non-browser requests (origin is undefined)
 * and verifies against configured domains, localhost ports, and production patterns.
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;

  const clean = origin.trim().replace(/\/+$/, '');

  const trusted = getTrustedOrigins();
  if (trusted.includes(clean)) return true;

  // Any localhost or 127.0.0.1 port (e.g. :3000, :3001, :3002, :5173)
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(clean)) {
    return true;
  }

  // Locus production domains & subdomains
  if (/^https:\/\/(.*\.)?teampoint\.online$/.test(clean)) {
    return true;
  }

  // Cloud hosting domains (Render, Vercel)
  if (/^https:\/\/.*\.onrender\.com$/.test(clean)) {
    return true;
  }
  if (/^https:\/\/.*\.vercel\.app$/.test(clean)) {
    return true;
  }

  return false;
}

