import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db/client.js';
import { env } from '../config/env.js';
import { users, accounts, sessions, verifications } from '../db/schema.js';

// Google OAuth is optional in development — only register if credentials are set
const googleProvider =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        },
      }
    : undefined;

if (!googleProvider) {
  console.warn(
    '[auth] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — ' +
    'Google OAuth disabled. Set them in .env.local to enable.'
  );
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: users,
      account: accounts,
      session: sessions,
      verification: verifications,
    },
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  ...(googleProvider && { socialProviders: googleProvider }),
  trustedOrigins: [
    env.VITE_APP_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  callbacks: {
    onSessionCreate: async (session: any) => {
      // Update lastSeenAt on login/session creation
      if (session?.session?.userId) {
        await db.update(users)
          .set({ lastSeenAt: new Date() })
          .where({ id: session.session.userId } as any);
      }
    },
  },
});
