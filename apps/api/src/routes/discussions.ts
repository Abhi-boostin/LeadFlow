import type { FastifyInstance } from 'fastify';
import { UuidParamSchema } from '@leadflow/shared';
import { prisma } from '@leadflow/db';
import { summariseText, isGroqConfigured } from '../lib/groq.js';
import { config } from '../config.js';

type StoredAiMetadata = {
  summary?: string;
  promptUsed?: string;
  model?: string;
  generatedAt?: string;
};

export async function discussionsRoutes(app: FastifyInstance) {
  // POST /api/v1/discussions/:id/summarize
  // Summarises a single discussion using the user's configured summarisation prompt.
  // Returns a cached summary if the prompt has not changed since the last run.
  app.post('/api/v1/discussions/:id/summarize', async (request, reply) => {
    if (!isGroqConfigured()) {
      return reply.status(503).send({
        error: {
          code: 'AI_UNAVAILABLE',
          message: 'GROQ_API_KEY is not configured on the server',
        },
      });
    }

    const { id } = UuidParamSchema.parse(request.params);
    const userId = request.userId;

    const discussion = await prisma.discussion.findFirst({
      where: { id, userId },
      include: { user: { select: { summarizationPrompt: true } } },
    });

    if (!discussion) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Discussion not found' },
      });
    }

    const userPrompt = discussion.user.summarizationPrompt;
    const cached = (discussion.aiMetadata as StoredAiMetadata | null) ?? null;

    if (cached?.summary && cached.promptUsed === userPrompt) {
      return reply.send({ summary: cached.summary, cached: true });
    }

    try {
      const summary = await summariseText(discussion.note, userPrompt);

      const metadata: StoredAiMetadata = {
        summary,
        promptUsed: userPrompt,
        model: config.GROQ_SUMMARY_MODEL,
        generatedAt: new Date().toISOString(),
      };

      await prisma.discussion.update({
        where: { id },
        data: { aiMetadata: metadata },
      });

      return reply.send({ summary, cached: false });
    } catch (err) {
      request.log.error({ err }, 'Groq summarisation failed');
      return reply.status(502).send({
        error: {
          code: 'AI_UPSTREAM_ERROR',
          message: err instanceof Error ? err.message : 'Summarisation failed',
        },
      });
    }
  });
}
