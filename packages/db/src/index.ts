import { PrismaClient } from './generated/index.js';

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

// Re-export everything from the generated client so consumers can do:
//   import { prisma, Prisma, LeadStatus, type Lead } from '@leadflow/db';
export * from './generated/index.js';

// Sample-data helpers.
export { createSampleLeadsForUser, buildSampleLeads } from './sample-data.js';
export type { SampleSeedResult } from './sample-data.js';
