import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { prisma } from '@leadflow/db';

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

declare module 'next-auth/jwt' {
  interface JWT {
    leadflowId?: string;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/signin',
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Always show account chooser - sales reps often have multiple Googles
      authorization: { params: { prompt: 'select_account' } },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== 'google' || !profile?.email) return false;

      try {
        const existing = await prisma.user.findUnique({
          where: { email: profile.email },
          select: { id: true },
        });

        if (existing) {
          // Returning user — refresh display name and avatar.
          await prisma.user.update({
            where: { id: existing.id },
            data: {
              name: profile.name ?? undefined,
              avatarUrl:
                typeof (profile as { picture?: unknown }).picture === 'string'
                  ? ((profile as { picture: string }).picture)
                  : null,
              googleId: account.providerAccountId,
            },
          });
        } else {
          await prisma.user.create({
            data: {
              email: profile.email,
              name: profile.name ?? 'Unnamed',
              avatarUrl:
                typeof (profile as { picture?: unknown }).picture === 'string'
                  ? ((profile as { picture: string }).picture)
                  : null,
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
      // On first sign-in, look up our internal id and put it in the token.
      if (user?.email && !token.leadflowId) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true },
        });
        if (dbUser) token.leadflowId = dbUser.id;
      }
      return token;
    },

    async session({ session, token }) {
      if (token.leadflowId && session.user) {
        session.user.id = token.leadflowId;
      }
      return session;
    },
  },
});
