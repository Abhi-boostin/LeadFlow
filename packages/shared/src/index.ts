import { z } from 'zod';

// Mirrors the LeadStatus enum in packages/db/prisma/schema.prisma.
// Kept in sync manually: if the Prisma enum changes, update here too.
export const LeadStatusSchema = z.enum([
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL_SENT',
  'WON',
  'LOST',
]);
export type LeadStatus = z.infer<typeof LeadStatusSchema>;
export const LeadStatusValues = LeadStatusSchema.options;

export const CreateLeadSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  company: z.string().max(100).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  status: LeadStatusSchema.optional(),
});
export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;

export const ListLeadsQuerySchema = z.object({
  status: LeadStatusSchema.optional(),
  q: z.string().max(100).optional(),
  followUp: z.enum(['today', 'overdue', 'upcoming']).optional(),
});
export type ListLeadsQuery = z.infer<typeof ListLeadsQuerySchema>;

export const UpdateLeadSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  company: z.string().max(100).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  status: LeadStatusSchema.optional(),
});
export type UpdateLeadInput = z.infer<typeof UpdateLeadSchema>;

export const UuidParamSchema = z.object({
  id: z.string().uuid(),
});
