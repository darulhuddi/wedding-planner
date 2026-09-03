import { describe, it, expect } from 'vitest';
import { TaskItem } from '../types/checklist';
import {
  getTimelineGroups,
  getTimelineSummary,
  addDaysYMD,
} from '../domain/timelineSelectors';
import { toggleTaskComplete } from '../utils/checklistUtils';

describe('Timeline Selectors & ViewModel (Timeline v1)', () => {
  const mockToday = '2026-09-02';

  const makeTask = (id: string, dueDate: string | null, status: 'todo' | 'completed' = 'todo'): TaskItem => ({
    id,
    title: `Task ${id}`,
    description: null,
    category: 'general',
    status,
    priority: 'medium',
    dueDate,
    estimatedMinutes: null,
    source: 'custom',
    templateId: null,
    eventIds: [],
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    completedAt: null,
  });

  describe('Wedding Day Precedence Corrective Patch', () => {
    it('1. Wedding date is today -> task goes to WEDDING_DAY', () => {
      const weddingDate = '2026-09-02'; // today
      const tasks = [makeTask('t-wedding-today', weddingDate)];
      const groups = getTimelineGroups(tasks, weddingDate, mockToday);

      const targetGroup = groups.find((g) => g.tasks.some((t) => t.id === 't-wedding-today'));
      expect(targetGroup?.key).toBe('wedding_day');
    });

    it('2. Wedding date is 3 days from today -> task goes to WEDDING_DAY, NOT THIS_WEEK', () => {
      const weddingDate = '2026-09-05'; // 3 days from today (within 7 days)
      const tasks = [makeTask('t-wedding-3days', weddingDate)];
      const groups = getTimelineGroups(tasks, weddingDate, mockToday);

      const targetGroup = groups.find((g) => g.tasks.some((t) => t.id === 't-wedding-3days'));
      expect(targetGroup?.key).toBe('wedding_day');
      expect(groups.find((g) => g.key === 'this_week')).toBeUndefined();
    });

    it('3. Wedding date is 20 days from today -> task goes to WEDDING_DAY, NOT UPCOMING', () => {
      const weddingDate = '2026-09-22'; // 20 days from today (within 8..30 days)
      const tasks = [makeTask('t-wedding-20days', weddingDate)];
      const groups = getTimelineGroups(tasks, weddingDate, mockToday);

      const targetGroup = groups.find((g) => g.tasks.some((t) => t.id === 't-wedding-20days'));
      expect(targetGroup?.key).toBe('wedding_day');
      expect(groups.find((g) => g.key === 'upcoming')).toBeUndefined();
    });

    it('4. Wedding date is more than 30 days away -> task goes to WEDDING_DAY, NOT FUTURE MONTH', () => {
      const weddingDate = '2026-11-15'; // > 30 days away
      const tasks = [makeTask('t-wedding-future', weddingDate)];
      const groups = getTimelineGroups(tasks, weddingDate, mockToday);

      const targetGroup = groups.find((g) => g.tasks.some((t) => t.id === 't-wedding-future'));
      expect(targetGroup?.key).toBe('wedding_day');
      expect(groups.find((g) => g.key === 'month_2026-11')).toBeUndefined();
    });

    it('5. Wedding date has passed -> task with dueDate === weddingDate remains in WEDDING_DAY', () => {
      const weddingDate = '2026-08-15'; // past date
      const tasks = [makeTask('t-wedding-passed', weddingDate)];
      const groups = getTimelineGroups(tasks, weddingDate, mockToday);

      const targetGroup = groups.find((g) => g.tasks.some((t) => t.id === 't-wedding-passed'));
      expect(targetGroup?.key).toBe('wedding_day');
      expect(groups.find((g) => g.key === 'overdue')).toBeUndefined();
    });

    it('6. Non-wedding task with dueDate < today -> remains OVERDUE', () => {
      const weddingDate = '2026-10-01';
      const tasks = [makeTask('t-overdue', '2026-08-20')];
      const groups = getTimelineGroups(tasks, weddingDate, mockToday);

      const targetGroup = groups.find((g) => g.tasks.some((t) => t.id === 't-overdue'));
      expect(targetGroup?.key).toBe('overdue');
    });

    it('7. Non-wedding task within 7 days -> remains THIS_WEEK', () => {
      const weddingDate = '2026-10-01';
      const tasks = [makeTask('t-this-week', '2026-09-04')];
      const groups = getTimelineGroups(tasks, weddingDate, mockToday);

      const targetGroup = groups.find((g) => g.tasks.some((t) => t.id === 't-this-week'));
      expect(targetGroup?.key).toBe('this_week');
    });
  });

  describe('General Timeline Functionality', () => {
    const sampleWedding = '2026-10-01';

    it('handles completed tasks without putting completed past tasks in overdue', () => {
      const completedOverdueTask = makeTask('t-completed-past', '2026-08-20', 'completed');
      const groups = getTimelineGroups([completedOverdueTask], sampleWedding, mockToday);

      expect(groups.find((g) => g.key === 'overdue')).toBeUndefined();
      expect(groups.find((g) => g.key === 'month_2026-08')).toBeDefined();
    });

    it('handles empty timeline', () => {
      const groups = getTimelineGroups([], sampleWedding, mockToday);
      expect(groups).toHaveLength(0);

      const summary = getTimelineSummary([], sampleWedding, mockToday);
      expect(summary.totalTasks).toBe(0);
      expect(summary.activeTasks).toBe(0);
    });

    it('guarantees no empty timeline groups are returned', () => {
      const singleTask = makeTask('t1', '2026-09-04');
      const groups = getTimelineGroups([singleTask], sampleWedding, mockToday);
      expect(groups).toHaveLength(1);
      expect(groups.every((g) => g.tasks.length > 0)).toBe(true);
    });

    it('task completion updates canonical state cleanly', () => {
      const task = makeTask('t1', '2026-09-04');
      const updated = toggleTaskComplete([task], 't1');
      expect(updated[0].status).toBe('completed');
    });

    it('correctly calculates summary thisWeekTasks for active tasks while timeline group renders all tasks', () => {
      const activeThisWeek = makeTask('t-active-1', '2026-09-04', 'todo');
      const completedThisWeek1 = makeTask('t-done-1', '2026-09-04', 'completed');
      const completedThisWeek2 = makeTask('t-done-2', '2026-09-05', 'completed');

      const tasks = [activeThisWeek, completedThisWeek1, completedThisWeek2];
      const summary = getTimelineSummary(tasks, sampleWedding, mockToday);
      const groups = getTimelineGroups(tasks, sampleWedding, mockToday);

      // Summary thisWeekTasks count represents ACTIVE tasks only (= 1)
      expect(summary.thisWeekTasks).toBe(1);

      // Timeline group still renders all 3 tasks (1 active + 2 completed history)
      const thisWeekGroup = groups.find((g) => g.key === 'this_week');
      expect(thisWeekGroup).toBeDefined();
      expect(thisWeekGroup?.tasks).toHaveLength(3);
    });

    it('derives wedding countdown from canonical weddingDate', () => {
      const summary = getTimelineSummary([], sampleWedding, mockToday);
      expect(summary.weddingDateFormatted).toBe('1 Oktober 2026');
      expect(summary.daysUntilWedding).toBeGreaterThan(0);
    });
  });
});
