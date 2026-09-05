import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAdminCouples, fetchAdminOverviewData } from './supabaseAdminAdapter';
import { supabase } from '../lib/supabaseClient';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('supabaseAdminAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches workspaces and aggregates task progress into AdminCoupleSummary', async () => {
    const mockWorkspaces = [
      {
        id: 'ws-100',
        user_id: 'usr-1',
        couple_name: 'Adit & Nisa',
        wedding_date: '2026-09-30',
        created_at: '2026-09-01T10:00:00Z',
        updated_at: '2026-09-04T10:00:00Z',
      },
    ];

    const mockTasks = [
      { workspace_id: 'ws-100', status: 'completed' },
      { workspace_id: 'ws-100', status: 'completed' },
      { workspace_id: 'ws-100', status: 'todo' },
    ];

    const fromMock = vi.mocked(supabase.from);

    // Mock workspaces query
    const workspacesSelectMock = vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: mockWorkspaces,
        error: null,
      }),
    });

    // Mock tasks query
    const tasksSelectMock = vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({
        data: mockTasks,
        error: null,
      }),
    });

    fromMock.mockImplementation((table: string) => {
      if (table === 'workspaces') {
        return { select: workspacesSelectMock } as any;
      }
      if (table === 'tasks') {
        return { select: tasksSelectMock } as any;
      }
      return {} as any;
    });

    const couples = await fetchAdminCouples();
    expect(couples).toHaveLength(1);
    expect(couples[0].id).toBe('ws-100');
    expect(couples[0].coupleName).toBe('Adit & Nisa');
    expect(couples[0].weddingDate).toBe('2026-09-30');
    expect(couples[0].totalTasks).toBe(3);
    expect(couples[0].completedTasks).toBe(2);
    expect(couples[0].progressPercentage).toBe(67);
  });

  it('handles empty database result safely without errors', async () => {
    const fromMock = vi.mocked(supabase.from);
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    } as any);

    const data = await fetchAdminOverviewData();
    expect(data.metrics.totalCouples).toBe(0);
    expect(data.recentCouples).toHaveLength(0);
    expect(data.attentionItems).toHaveLength(0);
  });

  it('correctly derives Paid vs Trial access tiers and metrics for 3 couples with 1 paid couple', async () => {
    const mockWorkspaces = [
      {
        id: 'ws-1',
        user_id: 'usr-1',
        couple_name: 'Adit & Nisa',
        wedding_date: '2026-09-30',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'ws-2',
        user_id: 'usr-2',
        couple_name: 'Rizal & Enda',
        wedding_date: '2026-10-15',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'ws-3',
        user_id: 'usr-3',
        couple_name: 'Adi Wahyudi',
        wedding_date: '2026-11-20',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const mockEntitlements = [
      {
        workspace_id: 'ws-1',
        tier: 'paid',
        source: 'order_webhook',
        expires_at: null,
      },
    ];

    const fromMock = vi.mocked(supabase.from);
    fromMock.mockImplementation((table: string) => {
      if (table === 'workspaces') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockWorkspaces,
              error: null,
            }),
          }),
        } as any;
      }
      if (table === 'tasks') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        } as any;
      }
      if (table === 'customer_access_entitlements') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: mockEntitlements,
              error: null,
            }),
          }),
        } as any;
      }
      if (table === 'orders') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        } as any;
      }
      return {} as any;
    });

    const couples = await fetchAdminCouples();
    expect(couples).toHaveLength(3);
    expect(couples.find((c) => c.id === 'ws-1')?.accessTier).toBe('Paid');
    expect(couples.find((c) => c.id === 'ws-2')?.accessTier).toBe('Trial');
    expect(couples.find((c) => c.id === 'ws-3')?.accessTier).toBe('Trial');

    const overview = await fetchAdminOverviewData();
    expect(overview.metrics.totalCouples).toBe(3);
    expect(overview.metrics.activeWeddings).toBe(3);
    expect(overview.metrics.activeTrial).toBe(2);
    expect(overview.metrics.paid).toBe(1);
  });
});
