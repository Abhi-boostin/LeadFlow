import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from './auth.config';

// Edge-safe NextAuth instance: built from `auth.config` ONLY, which has zero DB
// imports. The full instance with Prisma callbacks lives in `auth.ts` and is
// used in Node-runtime routes (Server Components, route handlers, server actions).
const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ['/signin', '/api/auth'];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isAuthed = !!req.auth;

  // Bounce unauthenticated users to /signin.
  if (!isAuthed && !isPublic) {
    const url = new URL('/signin', req.url);
    if (pathname !== '/') url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  // Signed-in users on /signin go home.
  if (isAuthed && pathname === '/signin') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
});

export const config = {
  // Run on every route except Next internals and static assets.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)',
  ],
};
