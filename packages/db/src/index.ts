import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __leadflowPrisma: PrismaClient | undefined;
}

// Singleton pattern: avoid spawning a new PrismaClient per hot-reload in dev,
// which exhausts Postgres connections quickly.
export const prisma =
  global.__leadflowPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__leadflowPrisma = prisma;
}

export * from '@prisma/client';
export { createSampleLeadsForUser, buildSampleLeads } from './sample-data.js';
export type { SampleSeedResult } from './sample-data.js';
