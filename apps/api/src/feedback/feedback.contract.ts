import { z } from 'zod';

export const feedbackTypeEnumSchema = z.enum([
  'bug',
  'feature_request',
  'general',
]);

export const feedbackStatusEnumSchema = z.enum([
  'open',
  'under_review',
  'planned',
  'in_progress',
  'resolved',
  'closed',
]);

export const feedbackPriorityEnumSchema = z.enum([
  'low',
  'medium',
  'high',
  'critical',
]);

export const createFeedbackSchema = z.object({
  type: feedbackTypeEnumSchema.default('bug'),
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters.')
    .max(200, 'Title cannot exceed 200 characters.'),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters.')
    .max(5000, 'Description cannot exceed 5000 characters.'),
  category: z.string().trim().max(50).optional(),
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address.')
    .optional()
    .or(z.literal('')),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export const feedbackItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().nullable(),
  userEmail: z.string().nullable(),
  userName: z.string().nullable(),
  type: feedbackTypeEnumSchema,
  title: z.string(),
  description: z.string(),
  category: z.string().nullable(),
  priority: feedbackPriorityEnumSchema,
  status: feedbackStatusEnumSchema,
  metadata: z.record(z.string(), z.unknown()),
  adminNotes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const adminFeedbackQuerySchema = z.object({
  type: feedbackTypeEnumSchema.optional(),
  status: feedbackStatusEnumSchema.optional(),
  priority: feedbackPriorityEnumSchema.optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const adminUpdateFeedbackSchema = z.object({
  status: feedbackStatusEnumSchema.optional(),
  priority: feedbackPriorityEnumSchema.optional(),
  adminNotes: z.string().max(2000).optional(),
});

export const feedbackListResponseSchema = z.object({
  items: z.array(feedbackItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
});

export const feedbackStatsResponseSchema = z.object({
  total: z.number().int().nonnegative(),
  openBugs: z.number().int().nonnegative(),
  criticalBugs: z.number().int().nonnegative(),
  openFeatureRequests: z.number().int().nonnegative(),
  inProgress: z.number().int().nonnegative(),
  resolved: z.number().int().nonnegative(),
});

export type FeedbackTypeContract = z.infer<typeof feedbackTypeEnumSchema>;
export type FeedbackStatusContract = z.infer<typeof feedbackStatusEnumSchema>;
export type FeedbackPriorityContract = z.infer<typeof feedbackPriorityEnumSchema>;
export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
export type FeedbackItem = z.infer<typeof feedbackItemSchema>;
export type AdminFeedbackQuery = z.infer<typeof adminFeedbackQuerySchema>;
export type AdminUpdateFeedbackInput = z.infer<typeof adminUpdateFeedbackSchema>;
export type FeedbackListResponse = z.infer<typeof feedbackListResponseSchema>;
export type FeedbackStatsResponse = z.infer<typeof feedbackStatsResponseSchema>;

