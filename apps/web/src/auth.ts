import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// Vercel is frontend-only. All database access lives on Render behind the API.
// The Auth.js signIn callback makes one server-to-server fetch to Render which
// runs the Prisma upsert against Supabase. No DB libraries, no native binaries,
// no Edge Runtime drama on the Vercel side.
const API_BASE_URL =
  process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '';
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN ?? '';

type TokenWithLeadflowId = Record<string, unknown> & { leadflowId?: string };
type AccountWithLeadflowId = Record<string, unknown> & { leadflowUserId?: string };

async function upsertGoogleUser(input: {
  email: string;
  name: string;
  picture: string | null;
  googleId: string;
}): Promise<string | null> {
  if (!API_BASE_URL || !INTERNAL_API_TOKEN) {
    console.error('[auth] missing API_BASE_URL or INTERNAL_API_TOKEN');
    return null;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/google-user`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-token': INTERNAL_API_TOKEN,
      },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[auth] upsert returned', res.status, body);
      return null;
    }
    const data = (await res.json()) as { userId?: string };
    return data.userId ?? null;
  } catch (err) {
    console.error('[auth] upsert fetch failed:', err);
    return null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== 'google' || !profile?.email) return false;
      const picture =
        typeof (profile as { picture?: unknown }).picture === 'string'
          ? ((profile as { picture: string }).picture)
          : null;

      const userId = await upsertGoogleUser({
        email: profile.email,
        name: profile.name ?? 'Unnamed',
        picture,
        googleId: account.providerAccountId,
      });
      if (!userId) return false;

      // Stash on the account so jwt callback (which runs right after) can read it.
      (account as AccountWithLeadflowId).leadflowUserId = userId;
      return true;
    },

    async jwt({ token, account }) {
      const t = token as TokenWithLeadflowId;
      const fromAccount = (account as AccountWithLeadflowId | null)?.leadflowUserId;
      if (fromAccount) t.leadflowId = fromAccount;
      return token;
    },

    async session({ session, token }) {
      const t = token as TokenWithLeadflowId;
      if (t.leadflowId && session.user) {
        session.user.id = t.leadflowId;
      }
      return session;
    },
  },
});
