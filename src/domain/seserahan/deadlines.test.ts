import { describe, it, expect } from 'vitest';
import {
  calculateMilestoneDeadline,
  getDefaultRecommendedItemDeadline,
  classifyItemDueStatus,
  SESERAHAN_MILESTONES,
} from './deadlines';

describe('Seserahan Deadlines Domain Logic', () => {
  const weddingDate = '2026-10-31';

  describe('calculateMilestoneDeadline', () => {
    it('calculates H-45 (finalize list) correctly', () => {
      const deadline = calculateMilestoneDeadline(weddingDate, 'finalize_list');
      // 2026-10-31 minus 45 days: 31 days in Oct -> minus 31 = Sep 30, minus 14 more days = Sep 16
      expect(deadline).toBe('2026-09-16');
    });

    it('calculates H-30 (purchase deadline) correctly', () => {
      const deadline = calculateMilestoneDeadline(weddingDate, 'start_purchasing');
      expect(deadline).toBe('2026-10-01');
    });

    it('calculates H-14 (all items ready) correctly', () => {
      const deadline = calculateMilestoneDeadline(weddingDate, 'all_items_available');
      expect(deadline).toBe('2026-10-17');
    });

    it('calculates H-7 (packaging deadline) correctly', () => {
      const deadline = calculateMilestoneDeadline(weddingDate, 'packaging');
      expect(deadline).toBe('2026-10-24');
    });

    it('calculates H-1 (final check) correctly', () => {
      const deadline = calculateMilestoneDeadline(weddingDate, 'final_check');
      expect(deadline).toBe('2026-10-30');
    });

    it('returns null if weddingDate is invalid or null', () => {
      expect(calculateMilestoneDeadline(null, 'final_check')).toBeNull();
      expect(calculateMilestoneDeadline('invalid-date', 'final_check')).toBeNull();
    });
  });

  describe('getDefaultRecommendedItemDeadline', () => {
    it('defaults to H-14 milestone deadline', () => {
      const defaultDeadline = getDefaultRecommendedItemDeadline(weddingDate);
      expect(defaultDeadline).toBe('2026-10-17');
    });

    it('returns null when weddingDate is not provided', () => {
      expect(getDefaultRecommendedItemDeadline(undefined)).toBeNull();
    });
  });

  describe('classifyItemDueStatus', () => {
    const today = '2026-10-15';

    it('returns no_date when item has no dueDate', () => {
      expect(classifyItemDueStatus({ dueDate: null, status: 'planned' }, today)).toBe('no_date');
      expect(classifyItemDueStatus({ dueDate: null, status: 'purchased' }, today)).toBe('no_date');
    });

    it('returns completed when item is completed, even if date is past', () => {
      expect(classifyItemDueStatus({ dueDate: '2026-10-10', status: 'completed' }, today)).toBe('completed');
    });

    it('returns overdue when dueDate < today and not completed', () => {
      expect(classifyItemDueStatus({ dueDate: '2026-10-14', status: 'planned' }, today)).toBe('overdue');
      expect(classifyItemDueStatus({ dueDate: '2026-10-14', status: 'purchased' }, today)).toBe('overdue');
    });

    it('returns due_soon when dueDate is within 7 days from today', () => {
      expect(classifyItemDueStatus({ dueDate: '2026-10-15', status: 'planned' }, today)).toBe('due_soon'); // today
      expect(classifyItemDueStatus({ dueDate: '2026-10-18', status: 'planned' }, today)).toBe('due_soon'); // in 3 days
      expect(classifyItemDueStatus({ dueDate: '2026-10-22', status: 'planned' }, today)).toBe('due_soon'); // in 7 days
    });

    it('returns normal when dueDate is more than 7 days ahead', () => {
      expect(classifyItemDueStatus({ dueDate: '2026-10-23', status: 'planned' }, today)).toBe('normal'); // 8 days ahead
      expect(classifyItemDueStatus({ dueDate: '2026-11-01', status: 'planned' }, today)).toBe('normal');
    });
  });
});
