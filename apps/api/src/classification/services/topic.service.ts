import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { asc, db, eq, topics, type Topic } from "@locus/database";
import { PREDEFINED_TOPICS } from "../schemas/topic.constants.js";

@Injectable()
export class TopicService implements OnModuleInit {
  private readonly logger = new Logger(TopicService.name);

  async onModuleInit() {
    await this.seedPredefinedTopics();
  }

  /**
   * Idempotently seeds predefined technical topics into the database.
   */
  async seedPredefinedTopics(): Promise<void> {
    try {
      for (const topicDef of PREDEFINED_TOPICS) {
        await db
          .insert(topics)
          .values({
            name: topicDef.name,
            slug: topicDef.slug,
            description: topicDef.description,
            isActive: true,
          })
          .onConflictDoUpdate({
            target: topics.slug,
            set: {
              name: topicDef.name,
              description: topicDef.description,
              isActive: true,
              updatedAt: new Date(),
            },
          });
      }
      this.logger.log(
        `Ensured all ${PREDEFINED_TOPICS.length} predefined topics are seeded and active.`,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to seed predefined topics: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Retrieves all currently active topics ordered alphabetically by display name.
   */
  async getActiveTopics(): Promise<Topic[]> {
    return db
      .select()
      .from(topics)
      .where(eq(topics.isActive, true))
      .orderBy(asc(topics.name));
  }

  /**
   * Returns a map of topic slugs to topic UUIDs for fast lookup.
   */
  async getTopicMapBySlug(): Promise<Map<string, string>> {
    const active = await this.getActiveTopics();
    const map = new Map<string, string>();
    for (const t of active) {
      map.set(t.slug, t.id);
    }
    return map;
  }
}

