import type { FastifyInstance } from 'fastify';
import { GoogleUserUpsertSchema } from '@leadflow/shared';
import { prisma } from '@leadflow/db';
import { config } from '../config.js';

/**
 * Auth routes called server-to-server by the Next.js Auth.js callbacks.
 * Protected by a shared INTERNAL_API_TOKEN header — never reachable from the browser.
 * This is what lets the frontend stay completely free of database code.
 */
export async function authRoutes(app: FastifyInstance) {
  // POST /api/v1/auth/google-user
  app.post('/api/v1/auth/google-user', async (request, reply) => {
    // Internal-only — the browser never hits this endpoint, only Vercel's serverless
    // function does. A shared secret in a header is sufficient.
    if (
      !config.INTERNAL_API_TOKEN ||
      request.headers['x-internal-token'] !== config.INTERNAL_API_TOKEN
    ) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Invalid or missing internal token' },
      });
    }

    const body = GoogleUserUpsertSchema.parse(request.body);

    const existing = await prisma.user.findUnique({
      where: { email: body.email },
      select: { id: true },
    });

    if (existing) {
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: body.name,
          avatarUrl: body.picture ?? null,
          googleId: body.googleId,
        },
        select: { id: true },
      });
      return reply.send({ userId: updated.id });
    }

    const created = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        avatarUrl: body.picture ?? null,
        googleId: body.googleId,
        onboardingCompletedAt: new Date(),
      },
      select: { id: true },
    });
    return reply.status(201).send({ userId: created.id });
  });
}
