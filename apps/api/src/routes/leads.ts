import type { FastifyInstance } from 'fastify';
import {
  CreateDiscussionSchema,
  CreateLeadSchema,
  ListLeadsQuerySchema,
  UpdateLeadSchema,
  UuidParamSchema,
} from '@leadflow/shared';
import { prisma, Prisma } from '@leadflow/db';

export async function leadsRoutes(app: FastifyInstance) {
  // GET /api/v1/leads
  // Filters: status, q (name/company contains, case-insensitive), followUp=today|overdue|upcoming
  app.get('/api/v1/leads', async (request, reply) => {
    const query = ListLeadsQuerySchema.parse(request.query);
    const userId = request.userId;

    const where: Prisma.LeadWhereInput = { userId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.q && query.q.length > 0) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { company: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    if (query.followUp === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      where.nextFollowUpAt = { gte: start, lte: end };
    } else if (query.followUp === 'overdue') {
      where.nextFollowUpAt = { lt: new Date() };
      // Overdue should ignore closed leads unless the caller explicitly asked for WON/LOST.
      if (!query.status) {
        where.status = { notIn: ['WON', 'LOST'] };
      }
    } else if (query.followUp === 'upcoming') {
      where.nextFollowUpAt = { gt: new Date() };
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: [{ lastDiscussionAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        discussions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { note: true, createdAt: true },
        },
      },
    });

    const shaped = leads.map((l) => ({
      id: l.id,
      name: l.name,
      company: l.company,
      phone: l.phone,
      status: l.status,
      nextFollowUpAt: l.nextFollowUpAt,
      lastDiscussionAt: l.lastDiscussionAt,
      createdAt: l.createdAt,
      lastNote: l.discussions[0]?.note ?? null,
    }));

    return reply.send({ leads: shaped });
  });

  // POST /api/v1/leads
  app.post('/api/v1/leads', async (request, reply) => {
    const body = CreateLeadSchema.parse(request.body);
    const userId = request.userId;

    const lead = await prisma.lead.create({
      data: {
        userId,
        name: body.name,
        company: body.company ?? null,
        phone: body.phone ?? null,
        status: body.status ?? 'NEW',
      },
    });

    return reply.status(201).send({ lead });
  });

  // GET /api/v1/leads/:id
  // Returns the lead plus its full discussion timeline (reverse chronological).
  app.get('/api/v1/leads/:id', async (request, reply) => {
    const { id } = UuidParamSchema.parse(request.params);
    const userId = request.userId;

    const lead = await prisma.lead.findFirst({
      where: { id, userId },
      include: {
        discussions: {
          orderBy: { createdAt: 'desc' },
          include: { transcription: { select: { id: true, durationSeconds: true } } },
        },
      },
    });

    if (!lead) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Lead not found' },
      });
    }

    return reply.send({ lead });
  });

  // PATCH /api/v1/leads/:id
  // Partial update: any of name, company, phone, status.
  app.patch('/api/v1/leads/:id', async (request, reply) => {
    const { id } = UuidParamSchema.parse(request.params);
    const body = UpdateLeadSchema.parse(request.body);
    const userId = request.userId;

    // Verify the lead belongs to the requesting user before mutating.
    // Same 404 response for missing vs cross-user lookup avoids enumeration.
    const existing = await prisma.lead.findFirst({ where: { id, userId } });
    if (!existing) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Lead not found' },
      });
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.company !== undefined && { company: body.company }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.status !== undefined && { status: body.status }),
      },
    });

    return reply.send({ lead });
  });

  // POST /api/v1/leads/:id/discussions
  // Creates a discussion and, in the same transaction, updates the parent lead's
  // denormalised `lastDiscussionAt` (always) and `nextFollowUpAt` (only if a date was set).
  app.post('/api/v1/leads/:id/discussions', async (request, reply) => {
    const { id: leadId } = UuidParamSchema.parse(request.params);
    const body = CreateDiscussionSchema.parse(request.body);
    const userId = request.userId;

    const lead = await prisma.lead.findFirst({ where: { id: leadId, userId } });
    if (!lead) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Lead not found' },
      });
    }

    const now = new Date();
    const followUp = body.followUpAt ?? null;

    const [discussion] = await prisma.$transaction([
      prisma.discussion.create({
        data: {
          leadId,
          userId,
          note: body.note,
          followUpAt: followUp,
          source: 'MANUAL',
        },
      }),
      prisma.lead.update({
        where: { id: leadId },
        data: {
          lastDiscussionAt: now,
          // Only overwrite the lead-level follow-up if the new discussion sets one.
          // A discussion logged without a follow-up date does not clear an existing one.
          ...(followUp ? { nextFollowUpAt: followUp } : {}),
        },
      }),
    ]);

    return reply.status(201).send({ discussion });
  });
}
