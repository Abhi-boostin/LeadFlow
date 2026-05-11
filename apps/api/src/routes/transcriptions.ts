import type { FastifyInstance } from 'fastify';
import { UuidParamSchema } from '@leadflow/shared';
import { prisma } from '@leadflow/db';
import { transcribeAudio, summariseText, isGroqConfigured } from '../lib/groq.js';
import { config } from '../config.js';

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export async function transcriptionsRoutes(app: FastifyInstance) {
  // POST /api/v1/leads/:id/transcriptions
  // Multipart audio upload. Transcribes via Whisper, summarises with the user's prompt,
  // creates a TRANSCRIPTION-source Discussion + Transcription row, updates lead denormalised fields.
  app.post('/api/v1/leads/:id/transcriptions', async (request, reply) => {
    if (!isGroqConfigured()) {
      return reply.status(503).send({
        error: { code: 'AI_UNAVAILABLE', message: 'GROQ_API_KEY is not configured' },
      });
    }

    const { id: leadId } = UuidParamSchema.parse(request.params);
    const userId = request.userId;

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, userId },
      include: { user: { select: { summarizationPrompt: true } } },
    });
    if (!lead) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Lead not found' },
      });
    }

    const part = await request.file();
    if (!part) {
      return reply.status(400).send({
        error: { code: 'NO_FILE', message: 'No audio file in request' },
      });
    }

    const buffer = await part.toBuffer();
    if (buffer.length === 0) {
      return reply.status(400).send({
        error: { code: 'EMPTY_FILE', message: 'Audio file is empty' },
      });
    }
    if (buffer.length > MAX_AUDIO_BYTES) {
      return reply.status(413).send({
        error: { code: 'FILE_TOO_LARGE', message: 'Audio file must be under 25MB' },
      });
    }

    let raw: { text: string; duration: number };
    let summary: string;
    try {
      raw = await transcribeAudio(buffer, part.filename || 'recording.webm');
      summary = await summariseText(raw.text, lead.user.summarizationPrompt);
    } catch (err) {
      request.log.error({ err }, 'Transcription pipeline failed');
      return reply.status(502).send({
        error: {
          code: 'AI_UPSTREAM_ERROR',
          message: err instanceof Error ? err.message : 'Transcription failed',
        },
      });
    }

    const now = new Date();
    const promptUsed = lead.user.summarizationPrompt;

    const [discussion] = await prisma.$transaction([
      prisma.discussion.create({
        data: {
          leadId,
          userId,
          note: summary,
          source: 'TRANSCRIPTION',
          createdAt: now,
          aiMetadata: {
            summary,
            promptUsed,
            model: config.GROQ_SUMMARY_MODEL,
            generatedAt: now.toISOString(),
          },
          transcription: {
            create: {
              audioUrl: null,
              rawTranscript: raw.text,
              summary,
              promptUsed,
              model: config.GROQ_TRANSCRIBE_MODEL,
              durationSeconds: raw.duration,
            },
          },
        },
        include: {
          transcription: { select: { id: true, durationSeconds: true } },
        },
      }),
      prisma.lead.update({
        where: { id: leadId },
        data: { lastDiscussionAt: now },
      }),
    ]);

    return reply.status(201).send({ discussion });
  });
}
