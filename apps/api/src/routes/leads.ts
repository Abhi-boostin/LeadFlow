import type { FastifyInstance } from 'fastify';
import { CreateLeadSchema, ListLeadsQuerySchema } from '@leadflow/shared';
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
}
