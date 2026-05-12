import type { FastifyInstance } from 'fastify';
import { UpdateUserSchema } from '@leadflow/shared';
import { prisma, createSampleLeadsForUser } from '@leadflow/db';

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  summarizationPrompt: true,
  smsNumber: true,
  smsOptIn: true,
  timezone: true,
  onboardingCompletedAt: true,
  createdAt: true,
} as const;

export async function meRoutes(app: FastifyInstance) {
  // GET /api/v1/me - returns the current user's profile and settings.
  app.get('/api/v1/me', async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: USER_SELECT,
    });
    if (!user) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }
    return reply.send({ user });
  });

  // PATCH /api/v1/me - partial update of name / summarization prompt / sms preferences / timezone.
  app.patch('/api/v1/me', async (request, reply) => {
    const body = UpdateUserSchema.parse(request.body);

    const existing = await prisma.user.findUnique({ where: { id: request.userId } });
    if (!existing) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    const user = await prisma.user.update({
      where: { id: request.userId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.summarizationPrompt !== undefined && {
          summarizationPrompt: body.summarizationPrompt,
        }),
        ...(body.smsNumber !== undefined && { smsNumber: body.smsNumber }),
        ...(body.smsOptIn !== undefined && { smsOptIn: body.smsOptIn }),
        ...(body.timezone !== undefined && { timezone: body.timezone }),
      },
      select: USER_SELECT,
    });

    return reply.send({ user });
  });

  // POST /api/v1/me/seed - one-shot demo seed for the current user.
  // Refuses if the user already has leads (re-seeding requires deleting first).
  app.post('/api/v1/me/seed', async (request, reply) => {
    const userId = request.userId;

    const existing = await prisma.lead.count({ where: { userId } });
    if (existing > 0) {
      return reply.status(409).send({
        error: {
          code: 'ALREADY_SEEDED',
          message: `You already have ${existing} lead${existing === 1 ? '' : 's'}. Delete them first to re-seed.`,
        },
      });
    }

    try {
      const result = await createSampleLeadsForUser(userId);
      return reply.status(201).send(result);
    } catch (err) {
      request.log.error({ err }, 'Sample seed failed');
      return reply.status(500).send({
        error: {
          code: 'SEED_FAILED',
          message: err instanceof Error ? err.message : 'Seed failed',
        },
      });
    }
  });
}
