import NextAuth from 'next-auth';
import { prisma } from '@leadflow/db';
import { authConfig } from './auth.config';

// JWT augmentation through 'next-auth/jwt' is fragile across bundlers (Next's
// bundler resolution loses the subpath on some platforms). We carry the custom
// claim through the token via casts inside the callbacks below.
type TokenWithLeadflowId = Record<string, unknown> & { leadflowId?: string };

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== 'google' || !profile?.email) return false;

      try {
        const existing = await prisma.user.findUnique({
          where: { email: profile.email },
          select: { id: true },
        });

        const picture =
          typeof (profile as { picture?: unknown }).picture === 'string'
            ? ((profile as { picture: string }).picture)
            : null;

        if (existing) {
          await prisma.user.update({
            where: { id: existing.id },
            data: {
              name: profile.name ?? undefined,
              avatarUrl: picture,
              googleId: account.providerAccountId,
            },
          });
        } else {
          await prisma.user.create({
            data: {
              email: profile.email,
              name: profile.name ?? 'Unnamed',
              avatarUrl: picture,
              googleId: account.providerAccountId,
              onboardingCompletedAt: new Date(),
            },
          });
        }
      } catch (err) {
        console.error('[auth] failed to upsert user on sign-in:', err);
        return false;
      }
      return true;
    },

    async jwt({ token, user }) {
      const t = token as TokenWithLeadflowId;
      if (user?.email && !t.leadflowId) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true },
        });
        if (dbUser) t.leadflowId = dbUser.id;
      }
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
