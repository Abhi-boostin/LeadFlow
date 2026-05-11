import type { FastifyInstance, FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

type ErrorPayload = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    // zod validation errors map to 422 Unprocessable Entity.
    if (error instanceof ZodError) {
      const payload: ErrorPayload = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request payload failed validation',
          details: error.flatten().fieldErrors,
        },
      };
      return reply.status(422).send(payload);
    }

    // Fastify-thrown HTTP errors (sensible plugin) come with a statusCode in the 4xx range.
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      const payload: ErrorPayload = {
        error: {
          code: error.code ?? 'BAD_REQUEST',
          message: error.message,
        },
      };
      return reply.status(error.statusCode).send(payload);
    }

    // Anything else is a server bug. Log full stack, return generic message.
    request.log.error({ err: error }, 'Unhandled error');
    const payload: ErrorPayload = {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Something went wrong',
      },
    };
    return reply.status(500).send(payload);
  });

  app.setNotFoundHandler((_request, reply) => {
    const payload: ErrorPayload = {
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    };
    return reply.status(404).send(payload);
  });
}
