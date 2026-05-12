import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
    };
  }
}

/**
 * Edge-safe Auth.js config: providers, pages, session strategy.
 * NO database imports — this module is bundled into the middleware which runs
 * in Next.js Edge Runtime (V8 isolates, no Node APIs, no eval).
 *
 * Full config with DB callbacks lives in `auth.ts` and runs in Node routes only.
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: { signIn: '/signin' },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: { params: { prompt: 'select_account' } },
    }),
  ],
} satisfies NextAuthConfig;
