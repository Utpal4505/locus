
import { z } from "zod";

const apiResponseMetaSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
  total: z.number().int().nonnegative().optional(),
  hasMore: z.boolean().optional(),
});

const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

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
