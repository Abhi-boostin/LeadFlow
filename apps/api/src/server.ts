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
import { meRoutes } from './routes/me.js';

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

  // Accept empty bodies on application/json POSTs. Default Fastify behaviour rejects
  // them with FST_ERR_CTP_EMPTY_JSON_BODY, but some endpoints (/summarize, future
  // webhook acks, etc.) take no payload — the request is fully specified by the URL.
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    function (_req, body, done) {
      if (typeof body === 'string' && body.length === 0) {
        return done(null, undefined);
      }
      try {
        done(null, JSON.parse(body as string));
      } catch (err) {
        const e = err as Error & { statusCode?: number };
        e.statusCode = 400;
        done(e);
      }
    },
  );

  registerErrorHandler(app);
  registerStubAuth(app);

  await app.register(healthRoutes);
  await app.register(meRoutes);
  await app.register(leadsRoutes);
  await app.register(discussionsRoutes);
  await app.register(transcriptionsRoutes);

  return app;
}
