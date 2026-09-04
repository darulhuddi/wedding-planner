import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatAdminFullDate,
  formatDaysToWeddingLabel,
  deriveCustomerAccessDetail,
  deriveRecentActivities,
} from '../../domain/adminSelectors';
import { TaskItem } from '../../types/checklist';
import { DEFAULT_ADMIN_ACCESS_CONFIG } from '../../types/admin';
import { fetchAdminCoupleDetail } from '../../repositories/supabaseAdminAdapter';
import * as adminRepository from '../../repositories/adminRepository';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Admin Couple Detail V1 Tests', () => {
  const fixedNow = new Date('2026-09-04T12:00:00Z');

  describe('Date & Countdown Formatters', () => {
    it('formats full Indonesian date (e.g. 30 September 2026)', () => {
      expect(formatAdminFullDate('2026-09-30')).toBe('30 September 2026');
      expect(formatAdminFullDate('2026-10-12')).toBe('12 Oktober 2026');
      expect(formatAdminFullDate(null)).toBe('Belum ditentukan');
    });

    it('formats days to wedding countdown label accurately', () => {
      expect(formatDaysToWeddingLabel(27)).toBe('27 hari menuju hari-H');
      expect(formatDaysToWeddingLabel(0)).toBe('Hari-H pernikahan hari ini');
      expect(formatDaysToWeddingLabel(-10)).toBe('Pernikahan telah terlaksana');
      expect(formatDaysToWeddingLabel(null)).toBe('Tanggal belum diatur');
    });
  });

  describe('Customer Access Detail Derivation', () => {
    it('derives trial access details correctly within trial window', () => {
      // Created 4 days ago with 14-day trial
      const createdAt = '2026-08-31T12:00:00Z';
      const access = deriveCustomerAccessDetail(
        createdAt,
        DEFAULT_ADMIN_ACCESS_CONFIG,
        null,
        fixedNow
      );

      expect(access.tier).toBe('Trial');
      expect(access.isExpired).toBe(false);
      expect(access.remainingDays).toBe(10);
      expect(access.startDate).toBe(createdAt);
    });

    it('derives expired access when past trial duration', () => {
      // Created 20 days ago with 14-day trial
      const createdAt = '2026-08-15T12:00:00Z';
      const access = deriveCustomerAccessDetail(
        createdAt,
        DEFAULT_ADMIN_ACCESS_CONFIG,
        null,
        fixedNow
      );

      expect(access.tier).toBe('Expired');
      expect(access.isExpired).toBe(true);
      expect(access.remainingDays).toBe(0);
    });

    it('handles paid access tier', () => {
      const createdAt = '2026-08-01T12:00:00Z';
      const access = deriveCustomerAccessDetail(
        createdAt,
        DEFAULT_ADMIN_ACCESS_CONFIG,
        'Paid',
        fixedNow
      );

      expect(access.tier).toBe('Paid');
      expect(access.isExpired).toBe(false);
    });
  });

  describe('Recent Activity Derivation', () => {
    it('derives real activities from completed tasks without fabrication', () => {
      const tasks: TaskItem[] = [
        {
          id: 't-1',
          title: 'Booking Gedung',
          description: null,
          category: 'venue',
          status: 'completed',
          priority: 'high',
          dueDate: '2026-09-01',
          estimatedMinutes: 60,
          source: 'template',
          templateId: null,
          eventIds: [],
          createdAt: '2026-08-20T00:00:00Z',
          updatedAt: '2026-09-03T10:00:00Z',
          completedAt: '2026-09-03T10:00:00Z',
        },
        {
          id: 't-2',
          title: 'Pilih Menu Catering',
          description: null,
          category: 'catering',
          status: 'in_progress',
          priority: 'medium',
          dueDate: null,
          estimatedMinutes: null,
          source: 'template',
          templateId: null,
          eventIds: [],
          createdAt: '2026-08-20T00:00:00Z',
          updatedAt: '2026-08-20T00:00:00Z',
          completedAt: null,
        },
      ];

      const activities = deriveRecentActivities(tasks);
      expect(activities).toHaveLength(1);
      expect(activities[0].title).toBe('Tugas Selesai');
      expect(activities[0].description).toBe('Menyelesaikan tugas: Booking Gedung');
      expect(activities[0].type).toBe('task_completed');
    });

    it('returns empty list when no tasks have activity timestamps', () => {
      const activities = deriveRecentActivities([]);
      expect(activities).toEqual([]);
    });
  });

  describe('Supabase Adapter fetchAdminCoupleDetail', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('returns null when workspace does not exist in Supabase', async () => {
      const fromMock = vi.mocked(supabase.from);
      fromMock.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await fetchAdminCoupleDetail('non-existent-id');
      expect(result).toBeNull();
    });

    it('returns complete couple detail when workspace is found', async () => {
      const mockWorkspace = {
        id: 'ws-777',
        user_id: 'user-777',
        couple_name: 'Adit & Nisa',
        wedding_date: '2026-09-30',
        estimated_budget: 120_000_000,
        estimated_guest_count: 500,
        primary_planning_priority: 'venue',
        created_at: '2026-09-01T00:00:00Z',
        updated_at: '2026-09-04T00:00:00Z',
      };

      const mockTasks = [
        {
          id: 'task-1',
          workspace_id: 'ws-777',
          title: 'Sewa Venue',
          category: 'venue',
          status: 'completed',
          priority: 'high',
          due_date: '2026-09-10',
          estimated_minutes: 60,
          source: 'template',
          template_id: null,
          event_ids: [],
          created_at: '2026-09-01T00:00:00Z',
          updated_at: '2026-09-02T00:00:00Z',
          completed_at: '2026-09-02T00:00:00Z',
        },
        {
          id: 'task-2',
          workspace_id: 'ws-777',
          title: 'Test Food Catering',
          category: 'catering',
          status: 'todo',
          priority: 'medium',
          due_date: null,
          estimated_minutes: null,
          source: 'template',
          template_id: null,
          event_ids: [],
          created_at: '2026-09-01T00:00:00Z',
          updated_at: '2026-09-01T00:00:00Z',
          completed_at: null,
        },
      ];

      const fromMock = vi.mocked(supabase.from);
      fromMock.mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockWorkspace,
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockTasks,
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'budget_expenses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [{ amount: 5000000 }],
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'budget_allocations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [{ amount: 20000000 }],
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'guests') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [{ id: 'g-1' }],
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'platform_configurations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const detail = await fetchAdminCoupleDetail('ws-777');
      expect(detail).not.toBeNull();
      expect(detail?.coupleName).toBe('Adit & Nisa');
      expect(detail?.totalTasks).toBe(2);
      expect(detail?.completedTasks).toBe(1);
      expect(detail?.progressPercentage).toBe(50);
      expect(detail?.modules).toHaveLength(6);
      expect(detail?.spentBudget).toBe(5000000);
      expect(detail?.actualGuestCount).toBe(1);
      expect(detail?.recentActivities).toHaveLength(1);
    });
  });
});
