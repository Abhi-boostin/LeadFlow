import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
  }
}

// Stub auth: trusts X-User-Id header. Swapped for Auth.js v5 JWT verification later.
// Lets us build and exercise business routes via curl while OAuth plumbing is wired up separately.
export function registerStubAuth(app: FastifyInstance) {
  app.decorateRequest('userId', '');

  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.url === '/health' || request.url.startsWith('/api/v1/auth')) {
      return;
    }

    const userId = request.headers['x-user-id'];
    if (typeof userId !== 'string' || userId.length === 0) {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing X-User-Id header',
        },
      });
    }
    request.userId = userId;
  });
}
