import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import multipart from '@fastify/multipart';
import { config } from './config.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { registerStubAuth } from './plugins/auth.js';
import { healthRoutes } from './routes/health.js';
import { leadsRoutes } from './routes/leads.js';
import { discussionsRoutes } from './routes/discussions.js';
import { transcriptionsRoutes } from './routes/transcriptions.js';

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      config.NODE_ENV === 'development'
        ? {
            transport: {
              target: 'pino-pretty',
              options: { translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
            },
          }
        : true,
    trustProxy: true,
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });
  await app.register(sensible);
  await app.register(multipart, {
    limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  });

  registerErrorHandler(app);
  registerStubAuth(app);

  await app.register(healthRoutes);
  await app.register(leadsRoutes);
  await app.register(discussionsRoutes);
  await app.register(transcriptionsRoutes);

  return app;
}
