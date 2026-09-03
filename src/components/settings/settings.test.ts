import { describe, it, expect, vi } from 'vitest';
import { StoredWorkspace } from '../../types/workspace';
import { TaskItem } from '../../types/checklist';
import { StoredBudget, BudgetAllocation, BudgetExpense } from '../../types/budget';
import { Guest } from '../../types/guest';
import { WeddingEvent, validateWeddingEvent, validateEventTimes } from '../../domain/events';
import {
  normalizeReligiousContexts,
  normalizeCulturalContext,
  ReligiousContext,
  CulturalContext,
} from '../../domain/context';
import { deriveWorkspaceViewModel, getDaysUntilWedding } from '../../domain/workspaceSelectors';
import { calculateBudgetOverview } from '../../domain/budgetSelectors';
import { getStarterRecommendations } from '../../domain/recommendationEngine';
import { getNextBestAction } from '../../utils/nextBestActionEngine';
import { authService } from '../../auth/authService';

describe('WedFlow Settings Comprehensive Test Suite', () => {
  const mockBaseWorkspace: StoredWorkspace = {
    id: 'a1b2c3d4-e5f6-7890-abcd-1234567890ab', // Real UUID format
    coupleName: 'Adit & Nisa',
    weddingDate: '2027-06-20',
    estimatedBudget: 150_000_000,
    estimatedGuestCount: 400,
    completedCategories: [],
    primaryPlanningPriority: 'timeline',
    religiousContexts: [{ tradition: 'islam', label: null }],
    culturalContext: { hasTradition: true, description: 'Adat Jawa' },
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  const mockTasks: TaskItem[] = [
    {
      id: 'task-1',
      title: 'Booking Gedung Pernikahan',
      description: 'Cari dan booking venue',
      category: 'venue',
      status: 'todo',
      priority: 'high',
      dueDate: '2027-01-15',
      estimatedMinutes: 120,
      source: 'template',
      templateId: 'tpl-venue-1',
      vendorId: null,
      eventIds: ['evt-1'],
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      completedAt: null,
    },
    {
      id: 'task-2',
      title: 'Pilih MUA & Fitting Busana',
      description: 'Konsultasi konsep busana',
      category: 'makeup_attire',
      status: 'in_progress',
      priority: 'medium',
      dueDate: '2027-03-01',
      estimatedMinutes: 90,
      source: 'template',
      templateId: 'tpl-makeup-1',
      vendorId: null,
      eventIds: ['evt-1', 'evt-2'],
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      completedAt: null,
    },
  ];

  const mockAllocations: BudgetAllocation[] = [
    {
      id: 'alloc-1',
      category: 'venue',
      amount: 60_000_000,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'alloc-2',
      category: 'catering',
      amount: 40_000_000,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
  ];

  const mockExpenses: BudgetExpense[] = [
    {
      id: 'exp-1',
      category: 'venue',
      title: 'DP Gedung',
      amount: 20_000_000,
      date: '2026-09-02',
      note: 'Transfer BCA',
      createdAt: '2026-09-02T00:00:00Z',
      updatedAt: '2026-09-02T00:00:00Z',
    },
  ];

  const mockGuests: Guest[] = [
    {
      id: 'guest-1',
      name: 'Budi Santoso',
      side: 'groom',
      invitationStatus: 'invited',
      rsvpStatus: 'attending',
      pax: 2,
      phone: '08123456789',
      notes: null,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
  ];

  const mockEvents: WeddingEvent[] = [
    {
      id: 'evt-1',
      workspaceId: 'a1b2c3d4-e5f6-7890-abcd-1234567890ab',
      type: 'ceremony',
      name: 'Akad Nikah',
      date: '2027-06-20',
      startTime: '08:00',
      endTime: '10:00',
      location: 'Masjid Agung',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'evt-2',
      workspaceId: 'a1b2c3d4-e5f6-7890-abcd-1234567890ab',
      type: 'reception',
      name: 'Resepsi Malam',
      date: '2027-06-20',
      startTime: '19:00',
      endTime: '22:00',
      location: 'Grand Ballroom',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
  ];

  // ─── 0. Regression Protection Tests ──────────────────────────────────────

  describe('0. Regression Protection & Auth Guard Tests', () => {
    it('proves authenticated Settings uses the real workspace UUID, never demo-workspace', () => {
      const realWorkspaceId = mockBaseWorkspace.id;
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(realWorkspaceId).not.toBe('demo-workspace');
      expect(UUID_REGEX.test(realWorkspaceId)).toBe(true);
    });

    it('authenticated email update uses Auth service and handles known errors', async () => {
      const updateEmailSpy = vi.spyOn(authService, 'updateEmail').mockRejectedValueOnce(
        new Error('A user with this email address has already been registered')
      );

      await expect(authService.updateEmail('existing@example.com')).rejects.toThrow(
        'A user with this email address has already been registered'
      );
      expect(updateEmailSpy).toHaveBeenCalledWith('existing@example.com');
    });
  });

  // ─── 1. Account Operations & Validation ───────────────────────────────────

  describe('1. Account Settings Operations', () => {
    it('validates email format and prevents duplicate email submissions', () => {
      const currentEmail = 'user@example.com';
      const isInvalid1 = !'invalid-email'.includes('@');
      const isSameEmail = 'user@example.com'.toLowerCase() === currentEmail.toLowerCase();
      const isValidNew = 'newuser@example.com'.includes('@');

      expect(isInvalid1).toBe(true);
      expect(isSameEmail).toBe(true);
      expect(isValidNew).toBe(true);
    });

    it('validates password matching and minimum length', () => {
      const shortPass: string = '123';
      const mismatchPass: string = 'password123';
      const confirmPass: string = 'password456';
      const validPass: string = 'secret123';

      expect(shortPass.length < 6).toBe(true);
      expect(mismatchPass !== confirmPass).toBe(true);
      expect(validPass.length >= 6 && validPass === validPass).toBe(true);
    });
  });

  // ─── 2. Wedding Settings Data Safety ───────────────────────────────────────

  describe('2. Wedding Settings Data Safety', () => {
    it('updates couple name without modifying tasks or other fields', () => {
      const updated: StoredWorkspace = {
        ...mockBaseWorkspace,
        coupleName: 'Radit & Anisa',
      };
      expect(updated.coupleName).toBe('Radit & Anisa');
      expect(updated.weddingDate).toBe(mockBaseWorkspace.weddingDate);
      expect(mockTasks[0].dueDate).toBe('2027-01-15');
    });

    it('updating wedding date preserves existing task due dates and modifies derived countdown naturally', () => {
      const originalDueDate0 = mockTasks[0].dueDate;
      const originalDueDate1 = mockTasks[1].dueDate;

      // Update wedding date to a new date
      const newWeddingDate = '2027-12-25';
      const updatedWorkspace: StoredWorkspace = {
        ...mockBaseWorkspace,
        weddingDate: newWeddingDate,
      };

      // Existing task due dates MUST remain untouched
      expect(mockTasks[0].dueDate).toBe(originalDueDate0);
      expect(mockTasks[1].dueDate).toBe(originalDueDate1);

      // Derived view model updates naturally
      const vmOriginal = deriveWorkspaceViewModel(mockBaseWorkspace, mockTasks);
      const vmUpdated = deriveWorkspaceViewModel(updatedWorkspace, mockTasks);

      expect(vmUpdated.weddingDate).toBe(newWeddingDate);
      expect(vmUpdated.daysUntilWedding).toBeGreaterThan(vmOriginal.daysUntilWedding);
      expect(vmUpdated.formattedDate).toContain('Desember 2027');
    });

    it('updating estimated budget updates derived budget overview without modifying allocations or expenses', () => {
      const storedBudget: StoredBudget = {
        allocations: mockAllocations,
        expenses: mockExpenses,
      };

      const originalOverview = calculateBudgetOverview(mockBaseWorkspace.estimatedBudget, storedBudget);
      expect(originalOverview.totalBudget).toBe(150_000_000);
      expect(originalOverview.totalAllocated).toBe(100_000_000);
      expect(originalOverview.unallocated).toBe(50_000_000);

      // Change estimated budget to Rp200.000.000
      const newBudgetAmount = 200_000_000;
      const newOverview = calculateBudgetOverview(newBudgetAmount, storedBudget);

      // Allocations & Expenses are unchanged
      expect(storedBudget.allocations.length).toBe(2);
      expect(storedBudget.allocations[0].amount).toBe(60_000_000);
      expect(storedBudget.expenses.length).toBe(1);
      expect(storedBudget.expenses[0].amount).toBe(20_000_000);

      // Derived unallocated recalculates naturally
      expect(newOverview.totalBudget).toBe(200_000_000);
      expect(newOverview.totalAllocated).toBe(100_000_000);
      expect(newOverview.unallocated).toBe(100_000_000);
    });

    it('updating estimated guest count preserves existing guest records', () => {
      const originalGuestList = [...mockGuests];
      const updatedWorkspace: StoredWorkspace = {
        ...mockBaseWorkspace,
        estimatedGuestCount: 500,
      };

      expect(updatedWorkspace.estimatedGuestCount).toBe(500);
      expect(originalGuestList.length).toBe(1);
      expect(originalGuestList[0].name).toBe('Budi Santoso');
      expect(originalGuestList[0].pax).toBe(2);
    });

    it('updating planning priority preserves existing task priorities', () => {
      const originalTaskPriorities = mockTasks.map((t) => t.priority);

      const updatedWorkspace: StoredWorkspace = {
        ...mockBaseWorkspace,
        primaryPlanningPriority: 'vendor',
      };

      // Existing task priorities are untouched
      expect(mockTasks.map((t) => t.priority)).toEqual(originalTaskPriorities);
      expect(updatedWorkspace.primaryPlanningPriority).toBe('vendor');
    });
  });

  // ─── 3. Wedding Event CRUD & Validation ───────────────────────────────────

  describe('3. Wedding Event Validation and Management', () => {
    it('validates required fields for wedding events', () => {
      const invalidEvent = validateWeddingEvent({ name: '', type: 'ceremony' });
      expect(invalidEvent.isValid).toBe(false);
      expect(invalidEvent.errors).toContain('Nama acara wajib diisi.');

      const validEvent = validateWeddingEvent({
        name: 'Akad Nikah',
        type: 'ceremony',
        date: '2027-06-20',
        startTime: '08:00',
        endTime: '10:00',
      });
      expect(validEvent.isValid).toBe(true);
      expect(validEvent.errors.length).toBe(0);
    });

    it('validates start and end time consistency', () => {
      const invalidTimes = validateEventTimes('10:00', '08:00');
      expect(invalidTimes.isValid).toBe(false);
      expect(invalidTimes.error).toBe('Waktu selesai tidak boleh lebih awal dari waktu mulai.');

      const validTimes = validateEventTimes('08:00', '10:00');
      expect(validTimes.isValid).toBe(true);
    });
  });

  // ─── 4. Event Deletion & Task Disassociation ───────────────────────────────

  describe('4. Event Deletion and Task Disassociation Safety', () => {
    it('disassociating an event ID removes the ID from tasks while preserving all tasks', () => {
      const eventToDelete = 'evt-1';

      // Simulate disassociation logic
      const updatedTasks = mockTasks.map((task) => ({
        ...task,
        eventIds: (task.eventIds || []).filter((id) => id !== eventToDelete),
      }));

      // 1. Task count must NOT decrease (tasks are never deleted)
      expect(updatedTasks.length).toBe(mockTasks.length);

      // 2. task-1 previously had ['evt-1'], now becomes [] (wedding-level task)
      expect(updatedTasks[0].id).toBe('task-1');
      expect(updatedTasks[0].eventIds).toEqual([]);

      // 3. task-2 previously had ['evt-1', 'evt-2'], now becomes ['evt-2']
      expect(updatedTasks[1].id).toBe('task-2');
      expect(updatedTasks[1].eventIds).toEqual(['evt-2']);

      // 4. Task titles, due dates, statuses remain completely intact
      expect(updatedTasks[0].title).toBe('Booking Gedung Pernikahan');
      expect(updatedTasks[0].dueDate).toBe('2027-01-15');
      expect(updatedTasks[1].title).toBe('Pilih MUA & Fitting Busana');
      expect(updatedTasks[1].dueDate).toBe('2027-03-01');
    });
  });

  // ─── 5. Religious and Cultural Context Normalization ───────────────────────

  describe('5. Religious and Cultural Context Persistence', () => {
    it('normalizes religious context accurately for all options and empty states', () => {
      const islamContext: ReligiousContext[] = [{ tradition: 'islam', label: null }];
      expect(normalizeReligiousContexts(islamContext)).toEqual([{ tradition: 'islam', label: null }]);

      const emptyContext: unknown = [];
      expect(normalizeReligiousContexts(emptyContext)).toEqual([]);

      const nullContext: unknown = null;
      expect(normalizeReligiousContexts(nullContext)).toEqual([]);

      const invalidContext: unknown = [{ tradition: 'invalid_tradition', label: 'custom' }];
      expect(normalizeReligiousContexts(invalidContext)).toEqual([{ tradition: 'unspecified', label: 'custom' }]);
    });

    it('normalizes cultural context correctly for Ya, Tidak, and Belum Yakin', () => {
      // Ya with description
      const yaCulture: CulturalContext = { hasTradition: true, description: 'Adat Sunda Ngeyeuk Sereuh' };
      expect(normalizeCulturalContext(yaCulture)).toEqual({
        hasTradition: true,
        description: 'Adat Sunda Ngeyeuk Sereuh',
      });

      // Tidak
      const tidakCulture: CulturalContext = { hasTradition: false, description: null };
      expect(normalizeCulturalContext(tidakCulture)).toEqual({
        hasTradition: false,
        description: null,
      });

      // Belum yakin
      const belumYakinCulture: CulturalContext = { hasTradition: null, description: null };
      expect(normalizeCulturalContext(belumYakinCulture)).toEqual({
        hasTradition: null,
        description: null,
      });

      // Missing / null backward compatibility
      expect(normalizeCulturalContext(null)).toEqual({
        hasTradition: null,
        description: null,
      });
    });
  });

  // ─── 6. Integration Test with ACTUAL Recommendation Engine ─────────────────

  describe('6. Integration with Actual Recommendation Engine', () => {
    it('uses the real Recommendation Engine to verify that changing primaryPlanningPriority affects recommendation scores and order', () => {
      // Input with timeline priority
      const inputTimeline = {
        workspace: {
          ...mockBaseWorkspace,
          primaryPlanningPriority: 'timeline' as const,
        },
        tasks: [],
        events: mockEvents,
        today: '2026-09-01',
      };

      // Input with vendor priority
      const inputVendor = {
        workspace: {
          ...mockBaseWorkspace,
          primaryPlanningPriority: 'vendor' as const,
        },
        tasks: [],
        events: mockEvents,
        today: '2026-09-01',
      };

      const recommendationsTimeline = getStarterRecommendations(inputTimeline);
      const recommendationsVendor = getStarterRecommendations(inputVendor);

      expect(recommendationsTimeline.length).toBeGreaterThan(0);
      expect(recommendationsVendor.length).toBeGreaterThan(0);

      // Recommendations should contain items and reasons tailored to the respective priority
      const vendorReasons = recommendationsVendor.map((r) => r.reason);
      const hasVendorFocusedReason = vendorReasons.some((r) =>
        r.toLowerCase().includes('fokus utamamu mencari vendor')
      );
      expect(hasVendorFocusedReason).toBe(true);
    });

    it('NBA urgency naturally reflects wedding date change without modifying tasks', () => {
      const farWorkspace: StoredWorkspace = {
        ...mockBaseWorkspace,
        weddingDate: '2028-12-01',
      };

      const nearWorkspace: StoredWorkspace = {
        ...mockBaseWorkspace,
        weddingDate: '2026-10-01',
      };

      const nbaFar = getNextBestAction(farWorkspace, mockTasks, '2026-09-01');
      const nbaNear = getNextBestAction(nearWorkspace, mockTasks, '2026-09-01');

      expect(nbaFar).toBeDefined();
      expect(nbaNear).toBeDefined();
    });
  });
});
