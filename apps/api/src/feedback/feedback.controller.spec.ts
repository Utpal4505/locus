import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedbackController } from './feedback.controller.js';
import { FeedbackService } from './feedback.service.js';
import type { User } from '../auth/auth.js';

describe('FeedbackController', () => {
  let controller: FeedbackController;
  let service: FeedbackService;

  const mockUser: User = {
    id: 'usr_test_1',
    email: 'utpal@example.com',
    name: 'Utpal',
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleItem = {
    id: '11111111-2222-3333-4444-555555555555',
    userId: 'usr_test_1',
    userEmail: 'utpal@example.com',
    userName: 'Utpal',
    type: 'bug' as const,
    title: 'Test issue',
    description: 'Detailed description with sufficient length for validation.',
    category: 'playback',
    priority: 'medium' as const,
    status: 'open' as const,
    metadata: {},
    adminNotes: null,
    createdAt: '2026-10-25T01:00:00.000Z',
    updatedAt: '2026-10-25T01:00:00.000Z',
  };

  beforeEach(() => {
    service = new FeedbackService();
    controller = new FeedbackController(service);
    vi.restoreAllMocks();
  });

  it('createFeedback extracts client context and calls service', async () => {
    const createSpy = vi.spyOn(service, 'createFeedback').mockResolvedValue(sampleItem);

    const req: any = {
      headers: {
        'x-forwarded-for': '203.0.113.195, 70.41.3.18',
        'user-agent': 'Mozilla/5.0 TestBrowser',
      },
    };

    const payload = {
      type: 'bug',
      title: 'Test issue',
      description: 'Detailed description with sufficient length for validation.',
    };

    const res = await controller.createFeedback(payload, mockUser, req);
    expect(res).toBe(sampleItem);
    expect(createSpy).toHaveBeenCalledWith(payload, mockUser, {
      ip: '203.0.113.195',
      userAgent: 'Mozilla/5.0 TestBrowser',
    });
  });

  it('getAdminFeedback delegates to service', async () => {
    const listRes = {
      items: [sampleItem],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };
    vi.spyOn(service, 'getAdminFeedback').mockResolvedValue(listRes);

    const res = await controller.getAdminFeedback({ status: 'open' });
    expect(res).toBe(listRes);
  });

  it('getFeedbackStats delegates to service', async () => {
    const statsRes = {
      total: 10,
      openBugs: 3,
      criticalBugs: 1,
      openFeatureRequests: 4,
      inProgress: 1,
      resolved: 2,
    };
    vi.spyOn(service, 'getFeedbackStats').mockResolvedValue(statsRes);

    const res = await controller.getFeedbackStats();
    expect(res).toBe(statsRes);
  });

  it('updateFeedback delegates to service', async () => {
    vi.spyOn(service, 'updateFeedback').mockResolvedValue({
      ...sampleItem,
      status: 'resolved',
    });

    const res = await controller.updateFeedback(sampleItem.id, {
      status: 'resolved',
    });
    expect(res.status).toBe('resolved');
  });

  it('deleteFeedback delegates to service', async () => {
    vi.spyOn(service, 'deleteFeedback').mockResolvedValue({
      success: true,
      id: sampleItem.id,
    });

    const res = await controller.deleteFeedback(sampleItem.id);
    expect(res.success).toBe(true);
  });
});

