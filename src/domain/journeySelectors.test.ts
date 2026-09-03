import { describe, it, expect } from 'vitest';
import { derivePreparationJourney } from './journeySelectors';
import { TaskItem } from '../types/checklist';

// Helper to create test tasks
function createTestTask(
  id: string,
  category: any,
  status: 'todo' | 'in_progress' | 'completed' = 'todo',
  dueDate: string | null = null,
  title: string = `Task ${id}`
): TaskItem {
  return {
    id,
    title,
    description: null,
    category,
    status,
    priority: 'medium',
    dueDate,
    estimatedMinutes: null,
    source: 'custom',
    templateId: null,
    eventIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: status === 'completed' ? new Date().toISOString() : null,
  };
}

describe('Preparation Journey Domain Selectors (derivePreparationJourney)', () => {
  const fixedToday = '2026-09-01';

  describe('Relative Time Phases by Wedding Date Distance', () => {
    it('generates 5+ months phases for wedding far in the future (> 150 days)', () => {
      // 200 days away
      const weddingDate = '2027-03-20';
      const tasks = [
        createTestTask('1', 'venue', 'todo', '2026-10-01', 'Kunci Gedung'),
        createTestTask('2', 'catering', 'todo', '2026-12-01', 'Test Food'),
      ];

      const journey = derivePreparationJourney(weddingDate, tasks, fixedToday);

      expect(journey.status).toBe('active');
      expect(journey.phases).toHaveLength(4);
      expect(journey.phases[0].period).toBe('5+ BULAN LAGI');
      expect(journey.phases[1].period).toBe('4–2 BULAN LAGI');
      expect(journey.phases[2].period).toBe('1 BULAN LAGI');
      expect(journey.phases[3].period).toBe('H-14 S/D HARI-H');
    });

    it('generates appropriate phases for wedding within a few months (60–150 days)', () => {
      // ~90 days away (approx 3 months)
      const weddingDate = '2026-12-01';
      const tasks = [
        createTestTask('1', 'venue', 'todo', '2026-09-15', 'Booking Venue'),
        createTestTask('2', 'decoration', 'todo', '2026-10-15', 'Konsep Dekor'),
      ];

      const journey = derivePreparationJourney(weddingDate, tasks, fixedToday);

      expect(journey.status).toBe('active');
      expect(journey.phases).toHaveLength(4);
      expect(journey.phases[1].period).toBe('2 BULAN LAGI');
      expect(journey.phases[2].period).toBe('1 BULAN LAGI');
      expect(journey.phases[3].period).toBe('H-14 S/D HARI-H');
    });

    it('generates appropriate phases for wedding within 30 days', () => {
      // 25 days away
      const weddingDate = '2026-09-26';
      const tasks = [
        createTestTask('1', 'invitation', 'todo', '2026-09-05', 'Sebar Undangan'),
        createTestTask('2', 'general', 'todo', '2026-09-20', 'Final Briefing'),
      ];

      const journey = derivePreparationJourney(weddingDate, tasks, fixedToday);

      expect(journey.status).toBe('active');
      expect(journey.phases).toHaveLength(4);
      expect(journey.phases[0].period).toBe('1–2 BULAN LAGI');
      expect(journey.phases[1].period).toBe('H-21 S/D H-14');
      expect(journey.phases[2].period).toBe('H-14 S/D H-7');
      expect(journey.phases[3].period).toBe('H-7 S/D HARI-H');
    });

    it('generates final countdown phases for wedding within 14 days', () => {
      // 10 days away
      const weddingDate = '2026-09-11';
      const tasks = [
        createTestTask('1', 'general', 'todo', '2026-09-02', 'Cek Rundown'),
      ];

      const journey = derivePreparationJourney(weddingDate, tasks, fixedToday);

      expect(journey.status).toBe('active');
      expect(journey.phases).toHaveLength(4);
      expect(journey.phases[0].period).toBe('H-14');
      expect(journey.phases[1].period).toBe('H-7');
      expect(journey.phases[2].period).toBe('H-3');
      expect(journey.phases[3].period).toBe('HARI-H');
    });
  });

  describe('Dynamic Task Association & State Progression ("Saat Ini")', () => {
    it('sets first active phase as "Saat Ini"', () => {
      const weddingDate = '2027-03-20';
      const tasks = [
        createTestTask('1', 'venue', 'todo', null, 'Cari Venue'),
        createTestTask('2', 'catering', 'todo', null, 'Cari Catering'),
      ];

      const journey = derivePreparationJourney(weddingDate, tasks, fixedToday);

      expect(journey.phases[0].isCurrent).toBe(true);
      expect(journey.phases[0].isCompleted).toBe(false);
      expect(journey.phases[1].isCurrent).toBe(false);
    });

    it('moves "Saat Ini" to the next phase when current phase tasks are completed', () => {
      const weddingDate = '2027-03-20';
      // Phase 1 tasks (venue, general) are completed
      // Phase 2 tasks (catering, photography) are still todo
      const tasks = [
        createTestTask('1', 'venue', 'completed', null, 'Cari Venue'),
        createTestTask('2', 'catering', 'todo', null, 'Cari Catering'),
        createTestTask('3', 'photography', 'todo', null, 'Cari Foto'),
      ];

      const journey = derivePreparationJourney(weddingDate, tasks, fixedToday);

      // Phase 1 should be marked completed
      expect(journey.phases[0].isCompleted).toBe(true);
      expect(journey.phases[0].isCurrent).toBe(false);

      // Phase 2 should now be "Saat Ini"
      expect(journey.phases[1].isCurrent).toBe(true);
      expect(journey.phases[1].isCompleted).toBe(false);
    });

    it('does not present completed tasks as active work in phase description', () => {
      const weddingDate = '2027-03-20';
      const tasks = [
        createTestTask('1', 'venue', 'completed', null, 'Kunci Gedung Serbaguna'),
      ];

      const journey = derivePreparationJourney(weddingDate, tasks, fixedToday);
      expect(journey.phases[0].isCompleted).toBe(true);
      expect(journey.phases[0].description).toContain('telah rampung');
      expect(journey.phases[0].description).not.toContain('tugas aktif');
    });
  });

  describe('Empty and Edge-Case States', () => {
    it('returns empty status when tasks array is empty without inventing fake tasks', () => {
      const weddingDate = '2027-03-20';
      const journey = derivePreparationJourney(weddingDate, [], fixedToday);

      expect(journey.status).toBe('empty');
      expect(journey.phases).toHaveLength(0);
      expect(journey.totalTasks).toBe(0);
    });

    it('returns passed status when wedding date is in the past without generating negative phases', () => {
      const pastWeddingDate = '2026-08-01'; // 1 month before fixedToday
      const tasks = [
        createTestTask('1', 'venue', 'completed', '2026-07-01'),
      ];

      const journey = derivePreparationJourney(pastWeddingDate, tasks, fixedToday);

      expect(journey.status).toBe('passed');
      expect(journey.phases).toHaveLength(0);
      expect(journey.daysUntilWedding).toBeLessThan(0);
    });

    it('returns today status when wedding date is today', () => {
      const todayWeddingDate = '2026-09-01'; // exact same date as fixedToday
      const tasks = [
        createTestTask('1', 'general', 'todo', '2026-09-01'),
      ];

      const journey = derivePreparationJourney(todayWeddingDate, tasks, fixedToday);

      expect(journey.status).toBe('today');
      expect(journey.daysUntilWedding).toBe(0);
    });
  });
});
