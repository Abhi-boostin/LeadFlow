import { PrismaClient, Prisma } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __leadflowPrisma: PrismaClient | undefined;
}

// Singleton pattern: avoid spawning a new PrismaClient per hot-reload in dev,
// which exhausts Postgres connections quickly.
export const prisma =
  globalThis.__leadflowPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__leadflowPrisma = prisma;
}

// Explicit re-exports. `export *` from @prisma/client does not reliably forward
// the `Prisma` namespace through every TypeScript module-resolution path - some
// build environments lose it. Being explicit avoids that.
export { Prisma, PrismaClient };
export type {
  User,
  Lead,
  Discussion,
  Transcription,
  NotificationLog,
} from '@prisma/client';
export { LeadStatus, DiscussionSource } from '@prisma/client';

export { createSampleLeadsForUser, buildSampleLeads } from './sample-data.js';
export type { SampleSeedResult } from './sample-data.js';
