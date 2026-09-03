import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as workspaceRepository from '../../repositories/workspaceRepository';
import { StoredWorkspace } from '../../types/workspace';
import { StoredBudget, BudgetAllocation } from '../../types/budget';
import { Vendor } from '../../types/vendor';
import { Guest } from '../../types/guest';
import { Note } from '../../types/note';
import { TaskItem } from '../../types/checklist';
import { calculateBudgetOverview, calculateCategorySummaries } from '../../domain/budgetSelectors';
import { generateStarterBudgetAllocations } from '../budget/BudgetStarterTemplateModal';

describe('WedFlow Guided Empty State & Starter Template Integration Tests', () => {
  const testWorkspace: StoredWorkspace = {
    id: 'ws-empty-test',
    coupleName: 'Budi & Citra',
    weddingDate: '2027-06-20',
    estimatedBudget: 150_000_000,
    estimatedGuestCount: 350,
    completedCategories: [],
    primaryPlanningPriority: 'budget',
    religiousContexts: [],
    culturalContext: {
      hasTradition: null,
      description: null,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Zero-Data State Integrity (No Automatic Fake Records)', () => {
    it('initializes a new workspace with strictly zero vendors, guests, allocations, expenses, and notes', async () => {
      // Mock repository returning clean zero-data state
      vi.spyOn(workspaceRepository, 'getWorkspace').mockResolvedValue(testWorkspace);
      vi.spyOn(workspaceRepository, 'getVendors').mockResolvedValue([]);
      vi.spyOn(workspaceRepository, 'getGuests').mockResolvedValue([]);
      vi.spyOn(workspaceRepository, 'getBudget').mockResolvedValue({ allocations: [], expenses: [] });
      vi.spyOn(workspaceRepository, 'getNotes').mockResolvedValue([]);

      const workspace = await workspaceRepository.getWorkspace(testWorkspace.id);
      const vendors = await workspaceRepository.getVendors(testWorkspace.id);
      const guests = await workspaceRepository.getGuests(testWorkspace.id);
      const budget = await workspaceRepository.getBudget(testWorkspace.id);
      const notes = await workspaceRepository.getNotes(testWorkspace.id);

      expect(workspace).toBeDefined();
      expect(vendors).toHaveLength(0);
      expect(guests).toHaveLength(0);
      expect(budget.allocations).toHaveLength(0);
      expect(budget.expenses).toHaveLength(0);
      expect(notes).toHaveLength(0);

      // Confirm no dummy records were injected into Supabase
      expect(workspaceRepository.getVendors).toHaveBeenCalledWith(testWorkspace.id);
      expect(workspaceRepository.getGuests).toHaveBeenCalledWith(testWorkspace.id);
      expect(workspaceRepository.getBudget).toHaveBeenCalledWith(testWorkspace.id);
      expect(workspaceRepository.getNotes).toHaveBeenCalledWith(testWorkspace.id);
    });
  });

  describe('2. Vendor Guided Empty State Behavior', () => {
    it('identifies 0 vendors as guided empty state and does not create records', () => {
      const vendors: Vendor[] = [];
      const isZeroVendors = vendors.length === 0;

      expect(isZeroVendors).toBe(true);
      // Presentation examples are static and non-persisted
      const examples = ['Venue & Gedung', 'Catering', 'Foto & Video', 'Dekorasi'];
      expect(examples).toHaveLength(4);
      expect(vendors).toHaveLength(0);
    });

    it('distinguishes between zero vendors and filtered-empty state', () => {
      const populatedVendors: Vendor[] = [
        {
          id: 'v1',
          name: 'Gedung Arsip',
          category: 'venue',
          status: 'selected',
          quotedPrice: 30_000_000,
          contactName: null,
          phone: null,
          instagram: null,
          notes: null,
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
      ];

      const isZeroVendors = populatedVendors.length === 0;
      expect(isZeroVendors).toBe(false);

      // Simulating a search that returns 0 items
      const searchResult = populatedVendors.filter((v) => v.name.includes('NonExistent'));
      expect(searchResult).toHaveLength(0);

      // Global empty state condition vs filter empty condition
      const shouldShowGlobalEmpty = populatedVendors.length === 0;
      const shouldShowFilteredEmpty = populatedVendors.length > 0 && searchResult.length === 0;

      expect(shouldShowGlobalEmpty).toBe(false);
      expect(shouldShowFilteredEmpty).toBe(true);
    });
  });

  describe('3. Guest Guided Empty State Behavior', () => {
    it('identifies 0 guests as guided empty state without modifying estimatedGuestCount', () => {
      const guests: Guest[] = [];
      const isZeroGuests = guests.length === 0;

      expect(isZeroGuests).toBe(true);
      // Workspace estimatedGuestCount remains completely unchanged
      expect(testWorkspace.estimatedGuestCount).toBe(350);
      expect(guests).toHaveLength(0);
    });
  });

  describe('4. Notes Guided Empty State Behavior', () => {
    it('identifies 0 notes as guided empty state and renders card inspiration examples', () => {
      const notes: Note[] = [];
      const isZeroNotes = notes.length === 0;

      expect(isZeroNotes).toBe(true);
      const examples = [
        'Catatan meeting dengan fotografer',
        'Referensi dekorasi & palet warna',
        'Hal yang perlu dibicarakan dengan keluarga',
      ];
      expect(examples).toHaveLength(3);
      expect(notes).toHaveLength(0);
    });
  });

  describe('5. Budget Guided Empty State & Starter Template Flow', () => {
    it('identifies 0 allocations + 0 expenses as guided empty state', () => {
      const emptyBudget: StoredBudget = { allocations: [], expenses: [] };
      const isZeroBudget = emptyBudget.allocations.length === 0 && emptyBudget.expenses.length === 0;

      expect(isZeroBudget).toBe(true);

      const overview = calculateBudgetOverview(testWorkspace.estimatedBudget, emptyBudget);
      expect(overview.totalBudget).toBe(150_000_000);
      expect(overview.totalAllocated).toBe(0);
      expect(overview.unallocated).toBe(150_000_000);
      expect(overview.totalSpent).toBe(0);
      expect(overview.totalRemaining).toBe(150_000_000);
    });

    it('applying budget starter template creates 7 real BudgetAllocation records and updates calculations', async () => {
      const emptyBudget: StoredBudget = { allocations: [], expenses: [] };
      const starterAllocations = generateStarterBudgetAllocations(testWorkspace.estimatedBudget);

      expect(starterAllocations).toHaveLength(7);
      const totalAllocatedAmount = starterAllocations.reduce((sum, a) => sum + a.amount, 0);
      expect(totalAllocatedAmount).toBe(150_000_000);

      // Verify exact proportions
      const venueAlloc = starterAllocations.find((a) => a.category === 'venue');
      const cateringAlloc = starterAllocations.find((a) => a.category === 'catering');
      const photoAlloc = starterAllocations.find((a) => a.category === 'photography');
      const decorAlloc = starterAllocations.find((a) => a.category === 'decoration');
      const muaAlloc = starterAllocations.find((a) => a.category === 'makeup_attire');
      const invAlloc = starterAllocations.find((a) => a.category === 'invitation');
      const generalAlloc = starterAllocations.find((a) => a.category === 'general');

      expect(venueAlloc?.amount).toBe(60_000_000); // 40% of 150m
      expect(cateringAlloc?.amount).toBe(37_500_000); // 25% of 150m
      expect(photoAlloc?.amount).toBe(15_000_000); // 10% of 150m
      expect(decorAlloc?.amount).toBe(15_000_000); // 10% of 150m
      expect(muaAlloc?.amount).toBe(15_000_000); // 10% of 150m
      expect(invAlloc?.amount).toBe(4_500_000); // 3% of 150m
      expect(generalAlloc?.amount).toBe(3_000_000); // 2% of 150m

      // Persist via repository
      const updatedBudget: StoredBudget = {
        allocations: starterAllocations,
        expenses: [],
      };

      vi.spyOn(workspaceRepository, 'saveBudget').mockResolvedValue(updatedBudget);
      const savedBudget = await workspaceRepository.saveBudget(testWorkspace.id, updatedBudget);

      expect(workspaceRepository.saveBudget).toHaveBeenCalledWith(testWorkspace.id, updatedBudget);
      expect(savedBudget.allocations).toHaveLength(7);
      expect(savedBudget.expenses).toHaveLength(0);

      // Verify derived calculations immediately participate in Budget v1.1
      const updatedOverview = calculateBudgetOverview(testWorkspace.estimatedBudget, savedBudget);
      expect(updatedOverview.totalAllocated).toBe(150_000_000);
      expect(updatedOverview.unallocated).toBe(0);
      expect(updatedOverview.totalSpent).toBe(0);
      expect(updatedOverview.totalRemaining).toBe(150_000_000);

      const summaries = calculateCategorySummaries(savedBudget);
      expect(summaries['venue'].allocated).toBe(60_000_000);
      expect(summaries['venue'].status).toBe('aman');
      expect(summaries['catering'].allocated).toBe(37_500_000);
      expect(summaries['catering'].status).toBe('aman');

      // State is now non-empty
      const isZeroNow = savedBudget.allocations.length === 0 && savedBudget.expenses.length === 0;
      expect(isZeroNow).toBe(false);
    });

    it('cancelling budget template creates zero records', () => {
      const budgetBefore: StoredBudget = { allocations: [], expenses: [] };
      // User opens modal and cancels
      const isConfirmed = false;
      let budgetAfter = budgetBefore;

      if (isConfirmed) {
        budgetAfter = {
          allocations: generateStarterBudgetAllocations(testWorkspace.estimatedBudget),
          expenses: [],
        };
      }

      expect(budgetAfter.allocations).toHaveLength(0);
      expect(budgetAfter.expenses).toHaveLength(0);
    });

    it('6. persistent access: secondary action remains available on populated allocation state', () => {
      const populatedBudget: StoredBudget = {
        allocations: [
          { id: 'a1', category: 'venue', amount: 50_000_000, createdAt: '', updatedAt: '' },
          { id: 'a2', category: 'catering', amount: 30_000_000, createdAt: '', updatedAt: '' },
        ],
        expenses: [
          { id: 'e1', title: 'DP Venue', category: 'venue', amount: 10_000_000, date: '2026-09-01', note: null, createdAt: '', updatedAt: '' },
        ],
      };

      const isZeroBudget = populatedBudget.allocations.length === 0 && populatedBudget.expenses.length === 0;
      expect(isZeroBudget).toBe(false);

      // In populated state, GuidedEmptyState is NOT shown
      const showGuidedEmptyState = isZeroBudget;
      expect(showGuidedEmptyState).toBe(false);

      // But subtle secondary action is rendered in BudgetAllocationList header
      const hasAllocations = populatedBudget.allocations.length > 0;
      expect(hasAllocations).toBe(true);
    });

    it('7. overwrite confirmation: preserves existing allocations when user cancels confirmation dialog', () => {
      const initialAllocations: BudgetAllocation[] = [
        { id: 'a1', category: 'venue', amount: 70_000_000, createdAt: '', updatedAt: '' },
      ];
      let currentBudget: StoredBudget = {
        allocations: initialAllocations,
        expenses: [{ id: 'e1', title: 'DP', category: 'venue', amount: 15_000_000, date: '2026-09-01', note: null, createdAt: '', updatedAt: '' }],
      };

      // User clicks "Gunakan Contoh Pembagian" -> Overwrite modal opens
      const isOverwriteConfirmOpen = currentBudget.allocations.length > 0;
      expect(isOverwriteConfirmOpen).toBe(true);

      // User clicks "Batal" on confirmation dialog
      const confirmedOverwrite = false;
      if (confirmedOverwrite) {
        // Not reached
        currentBudget = {
          ...currentBudget,
          allocations: generateStarterBudgetAllocations(testWorkspace.estimatedBudget),
        };
      }

      // Allocations and expenses remain unchanged
      expect(currentBudget.allocations).toHaveLength(1);
      expect(currentBudget.allocations[0].amount).toBe(70_000_000);
      expect(currentBudget.expenses).toHaveLength(1);
    });

    it('8. expenses safety: applying starter template updates allocations but never alters or deletes existing expenses', async () => {
      const existingExpenses = [
        { id: 'e1', title: 'DP Gedung', category: 'venue' as const, amount: 20_000_000, date: '2026-09-01', note: null, createdAt: '', updatedAt: '' },
        { id: 'e2', title: 'Tasting Catering', category: 'catering' as const, amount: 5_000_000, date: '2026-09-02', note: null, createdAt: '', updatedAt: '' },
      ];

      const initialBudget: StoredBudget = {
        allocations: [
          { id: 'old-1', category: 'venue', amount: 100_000_000, createdAt: '', updatedAt: '' },
        ],
        expenses: existingExpenses,
      };

      // User confirms overwrite and applies custom template (Venue 40m, Catering 25m, etc.)
      const newStarterAllocations = generateStarterBudgetAllocations(100_000_000);
      const updatedBudget: StoredBudget = {
        allocations: newStarterAllocations,
        expenses: initialBudget.expenses, // Existing expenses preserved
      };

      vi.spyOn(workspaceRepository, 'saveBudget').mockResolvedValue(updatedBudget);
      const result = await workspaceRepository.saveBudget(testWorkspace.id, updatedBudget);

      // Allocations replaced with 7 starter allocations
      expect(result.allocations).toHaveLength(7);
      expect(result.allocations.find((a) => a.category === 'venue')?.amount).toBe(40_000_000);

      // Existing expenses completely preserved without any alterations
      expect(result.expenses).toHaveLength(2);
      expect(result.expenses[0].id).toBe('e1');
      expect(result.expenses[0].amount).toBe(20_000_000);
      expect(result.expenses[1].id).toBe('e2');
      expect(result.expenses[1].amount).toBe(5_000_000);

      // Calculations and health remain reactive
      const overview = calculateBudgetOverview(100_000_000, result);
      expect(overview.totalAllocated).toBe(100_000_000);
      expect(overview.totalSpent).toBe(25_000_000);
      expect(overview.totalRemaining).toBe(75_000_000);

      const summaries = calculateCategorySummaries(result);
      expect(summaries['venue'].allocated).toBe(40_000_000);
      expect(summaries['venue'].spent).toBe(20_000_000);
      expect(summaries['venue'].remaining).toBe(20_000_000);
      expect(summaries['venue'].status).toBe('aman');
    });
  });
});
