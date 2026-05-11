import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { config } from './config.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { registerStubAuth } from './plugins/auth.js';
import { healthRoutes } from './routes/health.js';

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

  registerErrorHandler(app);
  registerStubAuth(app);

  await app.register(healthRoutes);

  return app;
}
