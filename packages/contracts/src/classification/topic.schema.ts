import { z } from "zod";

export const topicItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
});
export type TopicItem = z.infer<typeof topicItemSchema>;

export const topicsListResponseSchema = z.object({
  topics: z.array(topicItemSchema),
});
export type TopicsListResponse = z.infer<typeof topicsListResponseSchema>;

