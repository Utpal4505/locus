import "dotenv/config";
import { account, db, session, user, verification } from "@locus/database";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { fromNodeHeaders } from "better-auth/node";
import { emailService } from "./email.service.js";

const isProduction = process.env.NODE_ENV === "production";
const secret = process.env.BETTER_AUTH_SECRET;

if (!secret && isProduction) {
  throw new Error(
    "BETTER_AUTH_SECRET environment variable is required in production.",
  );
}

const socialProviders: {
  google?: { clientId: string; clientSecret: string };
  github?: { clientId: string; clientSecret: string };
} = {};

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  };
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  socialProviders.github = {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  };
}

const trustedOrigins = Array.from(
  new Set(
    [
      process.env.FRONTEND_URL,
      process.env.BETTER_AUTH_URL,
      "http://localhost:3000",
      "http://localhost:3002",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3002",
    ].filter(Boolean) as string[],
  ),
);

export const auth = betterAuth({
  secret:
    secret ??
    "locus_development_better_auth_secret_must_change_in_production_32chars",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3002",
  basePath: "/api/auth",
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async (data: {
      user: { email: string; name?: string | null };
      url: string;
      token: string;
    }) => {
      await emailService.sendResetPasswordEmail(data);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async (data: {
      user: { email: string; name?: string | null };
      url: string;
      token: string;
    }) => {
      await emailService.sendVerificationEmail(data);
    },
  },
  socialProviders,
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
});

export { fromNodeHeaders };
export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;

export function getAvailableAuthProviders() {
  return {
    emailPassword: true,
    google: Boolean(socialProviders.google),
    github: Boolean(socialProviders.github),
  };
}
