import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { zodResponseFormat } from "openai/helpers/zod";
import { PREDEFINED_TOPICS } from "../schemas/topic.constants.js";
import {
  VideoTaggingOutputSchema,
  type VideoTaggingOutput,
} from "../schemas/tagging.schema.js";

export const CLASSIFICATION_PROMPT_VERSION = "v1.0.0";
export const CLASSIFICATION_SCHEMA_VERSION = "v1.0.0";
export const DEFAULT_AI_MODEL = "gpt-6-luna";

export interface BatchRequestLine {
  custom_id: string;
  method: "POST";
  url: "/v1/chat/completions";
  body: {
    model: string;
    messages: Array<{ role: "system" | "user"; content: string }>;
    response_format: unknown;
    temperature: number;
    max_completion_tokens: number;
  };
}

@Injectable()
export class ClassificationService {
  private readonly logger = new Logger(ClassificationService.name);

  /**
   * Generates the system prompt instructing the model on topic definitions and constraints.
   */
  getSystemPrompt(): string {
    const topicListText = PREDEFINED_TOPICS.map(
      (t) => `- Slug: "${t.slug}" | Name: "${t.name}": ${t.description}`,
    ).join("\n");

    return `You are a precise technical video categorization classifier for Locus, an engineering learning platform.
Your task is to analyze a YouTube video's title and description, and assign zero to three relevant topics from our approved vocabulary.

APPROVED TOPICS:
${topicListText}

CLASSIFICATION RULES:
1. Assign between 0 and 3 topic slugs that directly represent the core educational or technical subject matter of the video.
2. Select only topic slugs from the approved list above.
3. If the video is non-technical, promotional, vague, personal vlog, gaming, or does not clearly match any approved topic, return an empty array: {"topic_ids": []}.
4. Prioritize high precision over recall: only assign a tag if the video genuinely covers that topic in depth.
5. Never invent or hallucinate new topic slugs.`;
  }

  /**
   * Constructs an OpenAI Batch API chat completion request object for a single video.
   */
  buildBatchRequestLine(
    video: { id: string; title: string; description: string | null },
    model = process.env.AI_TAGGING_MODEL || DEFAULT_AI_MODEL,
  ): BatchRequestLine {
    // Truncate description to 1,200 characters to prevent excessive token usage
    const cleanDesc = (video.description || "")
      .trim()
      .slice(0, 1200)
      .replace(/\s+/g, " ");

    const userContent = `Video Title: ${video.title.trim()}\n\nVideo Description:\n${cleanDesc || "No description provided."}`;

    return {
      custom_id: video.id,
      method: "POST",
      url: "/v1/chat/completions",
      body: {
        model,
        messages: [
          { role: "system", content: this.getSystemPrompt() },
          { role: "user", content: userContent },
        ],
        response_format: zodResponseFormat(
          VideoTaggingOutputSchema,
          "video_tagging",
        ),
        temperature: 0.1,
        max_completion_tokens: 100,
      },
    };
  }

  /**
   * Strictly parses and validates the assistant message content against the Zod schema
   * and the active approved topic vocabulary.
   */
  validateResponseContent(
    rawContent: string,
    activeSlugs: Set<string>,
  ): string[] {
    if (!rawContent || !rawContent.trim()) {
      return [];
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawContent);
    } catch {
      throw new BadRequestException({
        code: "MALFORMED_MODEL_RESPONSE",
        message: "Model response content is not valid JSON.",
      });
    }

    const parseResult = VideoTaggingOutputSchema.safeParse(parsedJson);
    if (!parseResult.success) {
      this.logger.warn(
        `Structured output validation failed: ${parseResult.error.message}`,
      );
      throw new BadRequestException({
        code: "INVALID_TAGGING_SCHEMA",
        message: `Structured output validation failed: ${parseResult.error.message}`,
      });
    }

    const { topic_ids } = parseResult.data as VideoTaggingOutput;

    // Deduplicate topic IDs
    const deduplicated = Array.from(new Set(topic_ids));

    if (deduplicated.length > 3) {
      throw new BadRequestException({
        code: "EXCESSIVE_TOPIC_COUNT",
        message: "Model returned more than the allowed maximum of 3 topics.",
      });
    }

    // Verify all slugs exist in the active vocabulary
    for (const slug of deduplicated) {
      if (!activeSlugs.has(slug)) {
        throw new BadRequestException({
          code: "UNKNOWN_TOPIC_SLUG",
          message: `Model returned topic slug "${slug}" which is not in the active vocabulary.`,
        });
      }
    }

    return deduplicated;
  }
}

