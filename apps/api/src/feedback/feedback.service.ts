import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  FeedbackRepository,
  type FeedbackRecord,
  type InsertFeedbackRecord,
} from './feedback.repository.js';
import {
  adminFeedbackQuerySchema,
  adminUpdateFeedbackSchema,
  createFeedbackSchema,
  type FeedbackItem,
  type FeedbackListResponse,
  type FeedbackStatsResponse,
} from './feedback.contract.js';
import type { User } from '../auth/auth.js';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(private readonly feedbackRepo: FeedbackRepository) {}

  /**
   * Submits a user bug report or feature request with automated diagnostic telemetry.
   */
  async createFeedback(
    rawInput: unknown,
    user?: User,
    clientContext?: { ip?: string; userAgent?: string },
  ): Promise<FeedbackItem> {
    const parseResult = createFeedbackSchema.safeParse(rawInput);
    if (!parseResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parseResult.error.issues.map((i: { message: string }) => i.message).join(', '),
        details: parseResult.error.format(),
      });
    }

    const input = parseResult.data;

    // Merge client-provided telemetry with server-side network hints
    const metadata = {
      ...input.metadata,
      serverRecorded: {
        ip: clientContext?.ip ?? null,
        userAgent: clientContext?.userAgent ?? null,
        receivedAt: new Date().toISOString(),
      },
    };

    // Determine initial priority: critical if explicitly high-impact bug, otherwise default
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    if (input.type === 'bug') {
      const lowerDesc = `${input.title} ${input.description}`.toLowerCase();
      if (
        lowerDesc.includes('crash') ||
        lowerDesc.includes('fatal') ||
        lowerDesc.includes('data loss')
      ) {
        priority = 'high';
      }
    }

    const userEmail = user?.email ?? (input.email && input.email.trim() ? input.email.trim() : null);
    const userName = user?.name ?? null;

    const inserted = await this.feedbackRepo.create({
      userId: user?.id ?? null,
      userEmail,
      userName,
      type: input.type,
      title: input.title,
      description: input.description,
      category: input.category ?? null,
      priority,
      status: 'open',
      metadata,
    });

    if (!inserted) {
      throw new BadRequestException({
        code: 'INSERTION_FAILED',
        message: 'Failed to record feedback.',
      });
    }

    this.logger.log(
      `Recorded ${inserted.type} [${inserted.id}] from ${userEmail ?? 'guest'}: "${inserted.title}"`,
    );

    return this.mapToFeedbackItem(inserted);
  }

  /**
   * Retrieves paginated feedback tickets with multi-dimensional filtering for the administrator.
   */
  async getAdminFeedback(rawQuery: unknown): Promise<FeedbackListResponse> {
    const parseResult = adminFeedbackQuerySchema.safeParse(rawQuery);
    if (!parseResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parseResult.error.issues.map((i: { message: string }) => i.message).join(', '),
      });
    }

    const query = parseResult.data;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.feedbackRepo.findManyWithCount(
      {
        type: query.type,
        status: query.status,
        priority: query.priority,
        search: query.search,
      },
      { limit, offset },
    );

    const totalPages = Math.ceil(total / limit);

    return {
      items: rows.map((r) => this.mapToFeedbackItem(r)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Calculates KPI metric counters for the admin triage dashboard.
   */
  async getFeedbackStats(): Promise<FeedbackStatsResponse> {
    const rows = await this.feedbackRepo.findAllForStats();

    let total = 0;
    let openBugs = 0;
    let criticalBugs = 0;
    let openFeatureRequests = 0;
    let inProgress = 0;
    let resolved = 0;

    for (const r of rows) {
      total++;
      if (r.type === 'bug') {
        if (r.status === 'open' || r.status === 'under_review') {
          openBugs++;
        }
        if (
          r.priority === 'critical' &&
          r.status !== 'resolved' &&
          r.status !== 'closed'
        ) {
          criticalBugs++;
        }
      } else if (r.type === 'feature_request') {
        if (
          r.status === 'open' ||
          r.status === 'under_review' ||
          r.status === 'planned'
        ) {
          openFeatureRequests++;
        }
      }

      if (r.status === 'in_progress') {
        inProgress++;
      } else if (r.status === 'resolved' || r.status === 'closed') {
        resolved++;
      }
    }

    return {
      total,
      openBugs,
      criticalBugs,
      openFeatureRequests,
      inProgress,
      resolved,
    };
  }

  /**
   * Updates triage status, priority, or private notes for a feedback ticket.
   */
  async updateFeedback(
    id: string,
    rawInput: unknown,
  ): Promise<FeedbackItem> {
    const parseResult = adminUpdateFeedbackSchema.safeParse(rawInput);
    if (!parseResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: parseResult.error.issues.map((i: { message: string }) => i.message).join(', '),
      });
    }

    const input = parseResult.data;

    const existing = await this.feedbackRepo.findById(id);

    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: `Feedback ticket with ID ${id} was not found.`,
      });
    }

    const updates: Partial<InsertFeedbackRecord> = {
      updatedAt: new Date(),
    };

    if (input.status !== undefined) {
      updates.status = input.status;
    }
    if (input.priority !== undefined) {
      updates.priority = input.priority;
    }
    if (input.adminNotes !== undefined) {
      updates.adminNotes = input.adminNotes;
    }

    const updated = await this.feedbackRepo.update(id, updates);

    this.logger.log(`Admin updated feedback ticket ${id}`);

    return this.mapToFeedbackItem(updated!);
  }

  /**
   * Permanently deletes a feedback item (e.g. spam).
   */
  async deleteFeedback(id: string): Promise<{ success: boolean; id: string }> {
    const existing = await this.feedbackRepo.findById(id);

    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: `Feedback ticket with ID ${id} was not found.`,
      });
    }

    await this.feedbackRepo.delete(id);
    this.logger.log(`Admin deleted feedback ticket ${id}`);

    return { success: true, id };
  }

  private mapToFeedbackItem(r: FeedbackRecord): FeedbackItem {
    return {
      id: r.id,
      userId: r.userId,
      userEmail: r.userEmail,
      userName: r.userName,
      type: r.type,
      title: r.title,
      description: r.description,
      category: r.category,
      priority: r.priority,
      status: r.status,
      metadata: (r.metadata as Record<string, unknown>) ?? {},
      adminNotes: r.adminNotes,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
