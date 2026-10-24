import { z } from "zod";
import { TOPIC_SLUGS } from "./topic.constants.js";

export const VideoTaggingOutputSchema = z.object({
  topic_ids: z
    .array(z.enum(TOPIC_SLUGS))
    .max(3)
    .describe(
      "Zero to three concise technical topic slugs from the approved vocabulary representing the video's core focus. Return an empty array if no topics are a strong match.",
    ),
});

export type VideoTaggingOutput = z.infer<typeof VideoTaggingOutputSchema>;

