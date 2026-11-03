import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  count,
  desc,
  eq,
  feedback,
  ilike,
  or,
} from '@locus/database';
import { DRIZZLE_DB, type DrizzleDb } from '../database/index.js';

export type FeedbackRecord = typeof feedback.$inferSelect;
export type InsertFeedbackRecord = typeof feedback.$inferInsert;

export interface FeedbackFilterOptions {
  type?: string;
  status?: string;
  priority?: string;
  search?: string;
}

export interface FeedbackPaginationOptions {
  limit: number;
  offset: number;
}

@Injectable()
export class FeedbackRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async create(data: InsertFeedbackRecord): Promise<FeedbackRecord> {
    const [inserted] = await this.db
      .insert(feedback)
      .values(data)
      .returning();

    return inserted;
  }

  async findById(id: string): Promise<FeedbackRecord | null> {
    const [existing] = await this.db
      .select()
      .from(feedback)
      .where(eq(feedback.id, id))
      .limit(1);

    return existing ?? null;
  }

  async findManyWithCount(
    filters: FeedbackFilterOptions,
    pagination: FeedbackPaginationOptions,
  ): Promise<{ rows: FeedbackRecord[]; total: number }> {
    const conditions = [];

    if (filters.type) {
      conditions.push(eq(feedback.type, filters.type as any));
    }

    if (filters.status) {
      conditions.push(eq(feedback.status, filters.status as any));
    }

    if (filters.priority) {
      conditions.push(eq(feedback.priority, filters.priority as any));
    }

    if (filters.search && filters.search.trim().length > 0) {
      const pattern = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(feedback.title, pattern),
          ilike(feedback.description, pattern),
          ilike(feedback.userEmail, pattern),
          ilike(feedback.userName, pattern),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRow] = await this.db
      .select({ count: count() })
      .from(feedback)
      .where(whereClause);

    const total = Number(totalRow?.count ?? 0);

    const rows = await this.db
      .select()
      .from(feedback)
      .where(whereClause)
      .orderBy(desc(feedback.createdAt))
      .limit(pagination.limit)
      .offset(pagination.offset);

    return { rows, total };
  }

  async findAllForStats(): Promise<FeedbackRecord[]> {
    return this.db.select().from(feedback);
  }

  async update(
    id: string,
    updates: Partial<InsertFeedbackRecord>,
  ): Promise<FeedbackRecord | null> {
    const [updated] = await this.db
      .update(feedback)
      .set(updates)
      .where(eq(feedback.id, id))
      .returning();

    return updated ?? null;
  }

  async delete(id: string): Promise<boolean> {
    await this.db.delete(feedback).where(eq(feedback.id, id));
    return true;
  }
}

