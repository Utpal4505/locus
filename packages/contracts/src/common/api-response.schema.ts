import { z } from "zod";

/**
 * Standardized API error response schema returned by Locus NestJS backend endpoints.
 */
export const apiErrorResponseSchema = z.object({
  statusCode: z.number().int(),
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

/**
 * @deprecated Legacy meta schema from initial draft
 */
export const apiResponseMetaSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
  total: z.number().int().nonnegative().optional(),
  hasMore: z.boolean().optional(),
});

/**
 * @deprecated Use apiErrorResponseSchema instead
 */
export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

/**
 * @deprecated Locus uses direct REST payloads for success responses.
 */
export function createApiResponseSchema<TData extends z.ZodType>(
  dataSchema: TData,
) {
  return z.discriminatedUnion("success", [
    z.object({
      success: z.literal(true),
      data: dataSchema.optional(),
      meta: apiResponseMetaSchema.optional(),
    }),
    z.object({
      success: z.literal(false),
      error: apiErrorSchema,
    }),
  ]);
}

export type ApiResponse<TData extends z.ZodType> = z.infer<
  ReturnType<typeof createApiResponseSchema<TData>>
>;
