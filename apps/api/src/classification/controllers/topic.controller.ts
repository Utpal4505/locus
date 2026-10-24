import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";
import { TopicService } from "../services/topic.service.js";
import type { TopicsListResponse } from "../schemas/monitoring.contract.js";

@Controller("api/topics")
export class TopicController {
  constructor(private readonly topicService: TopicService) {}

  /**
   * Returns all active topics with their slugs and descriptions for feed filters.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getTopics(): Promise<TopicsListResponse> {
    if (process.env.AI_VIDEO_TAGGING_ENABLED !== "true") {
      return { topics: [] };
    }

    const topics = await this.topicService.getActiveTopics();
    return {
      topics: topics.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        description: t.description,
        isActive: t.isActive,
      })),
    };
  }
}

