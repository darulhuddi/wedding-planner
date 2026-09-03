import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as workspaceRepository from './workspaceRepository';
import * as supabaseBudgetAdapter from './supabaseBudgetAdapter';
import { BudgetExpense, StoredBudget } from '../types/budget';
import { calculateBudgetOverview } from '../domain/budgetSelectors';

describe('Budget Expense Persistence & Reload Regression Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const workspaceA = 'ws-aaaa-1111-4111-8111-aaaaaaaaaaaa';
  const workspaceB = 'ws-bbbb-2222-4222-8222-bbbbbbbbbbbb';

  const initialBudgetA: StoredBudget = {
    allocations: [
      { id: 'alloc-1', category: 'catering', amount: 25_000_000, createdAt: '', updatedAt: '' },
    ],
    expenses: [],
  };

  it('1. Create Expense -> Persists to Supabase -> Survives Reload / Refresh', async () => {
    const inMemoryDb: Record<string, BudgetExpense[]> = {
      [workspaceA]: [],
      [workspaceB]: [],
    };

    // Mock adapter operations with inMemoryDb scoped by workspaceId
    vi.spyOn(supabaseBudgetAdapter, 'insertBudgetExpense').mockImplementation(
      async (wsId: string, expense: BudgetExpense) => {
        inMemoryDb[wsId] = [...(inMemoryDb[wsId] || []), expense];
        return expense;
      }
    );

    vi.spyOn(supabaseBudgetAdapter, 'fetchBudgetByWorkspaceId').mockImplementation(
      async (wsId: string) => {
        return {
          allocations: wsId === workspaceA ? initialBudgetA.allocations : [],
          expenses: inMemoryDb[wsId] || [],
        };
      }
    );

    // Initial state: 0 spent
    const initialOverview = calculateBudgetOverview(100_000_000, initialBudgetA);
    expect(initialOverview.totalSpent).toBe(0);
    expect(initialOverview.totalRemaining).toBe(100_000_000);

    // Step A: Add Expense "DP Catering" Rp1.500.000
    const newExpense: BudgetExpense = {
      id: 'exp-catering-1',
      title: 'DP Catering',
      category: 'catering',
      amount: 1_500_000,
      date: '2026-09-03',
      note: 'DP 10%',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await workspaceRepository.createBudgetExpense(workspaceA, newExpense);

    // Step B: Runtime state reflects update immediately
    const runtimeBudget: StoredBudget = {
      ...initialBudgetA,
      expenses: [newExpense],
    };
    const runtimeOverview = calculateBudgetOverview(100_000_000, runtimeBudget);
    expect(runtimeOverview.totalSpent).toBe(1_500_000);
    expect(runtimeOverview.totalRemaining).toBe(98_500_000);

    // Step C: Simulate Browser Refresh / App reload via getBudget
    const reloadedBudget = await workspaceRepository.getBudget(workspaceA);
    expect(reloadedBudget.expenses).toHaveLength(1);
    expect(reloadedBudget.expenses[0].id).toBe('exp-catering-1');
    expect(reloadedBudget.expenses[0].title).toBe('DP Catering');
    expect(reloadedBudget.expenses[0].amount).toBe(1_500_000);

    const reloadedOverview = calculateBudgetOverview(100_000_000, reloadedBudget);
    expect(reloadedOverview.totalSpent).toBe(1_500_000);
    expect(reloadedOverview.totalRemaining).toBe(98_500_000);
  });

  it('2. Edit Expense -> Persists Updated Values -> Survives Reload', async () => {
    let expenseInDb: BudgetExpense = {
      id: 'exp-catering-1',
      title: 'DP Catering',
      category: 'catering',
      amount: 1_500_000,
      date: '2026-09-03',
      note: null,
      createdAt: '2026-09-03T00:00:00Z',
      updatedAt: '2026-09-03T00:00:00Z',
    };

    vi.spyOn(supabaseBudgetAdapter, 'updateBudgetExpense').mockImplementation(
      async (_wsId: string, updated: BudgetExpense) => {
        expenseInDb = { ...updated, updatedAt: new Date().toISOString() };
        return expenseInDb;
      }
    );

    vi.spyOn(supabaseBudgetAdapter, 'fetchBudgetByWorkspaceId').mockImplementation(
      async () => ({
        allocations: [],
        expenses: [expenseInDb],
      })
    );

    // Edit expense amount to Rp2.000.000
    const editedExpense: BudgetExpense = {
      ...expenseInDb,
      amount: 2_000_000,
      note: 'Pelunasan bertahap',
    };

    await workspaceRepository.updateBudgetExpense(workspaceA, editedExpense);

    // Simulate reload
    const reloaded = await workspaceRepository.getBudget(workspaceA);
    expect(reloaded.expenses).toHaveLength(1);
    expect(reloaded.expenses[0].amount).toBe(2_000_000);
    expect(reloaded.expenses[0].note).toBe('Pelunasan bertahap');

    const overview = calculateBudgetOverview(100_000_000, reloaded);
    expect(overview.totalSpent).toBe(2_000_000);
    expect(overview.totalRemaining).toBe(98_000_000);
  });

  it('3. Delete Expense -> Removed from DB -> Stays Deleted on Reload', async () => {
    let expensesInDb: BudgetExpense[] = [
      {
        id: 'exp-catering-1',
        title: 'DP Catering',
        category: 'catering',
        amount: 1_500_000,
        date: '2026-09-03',
        note: null,
        createdAt: '2026-09-03T00:00:00Z',
        updatedAt: '2026-09-03T00:00:00Z',
      },
    ];

    vi.spyOn(supabaseBudgetAdapter, 'deleteBudgetExpense').mockImplementation(
      async (_wsId: string, expenseId: string) => {
        expensesInDb = expensesInDb.filter((e) => e.id !== expenseId);
      }
    );

    vi.spyOn(supabaseBudgetAdapter, 'fetchBudgetByWorkspaceId').mockImplementation(
      async () => ({
        allocations: [],
        expenses: expensesInDb,
      })
    );

    // Delete expense
    await workspaceRepository.deleteBudgetExpense(workspaceA, 'exp-catering-1');

    // Simulate reload
    const reloaded = await workspaceRepository.getBudget(workspaceA);
    expect(reloaded.expenses).toHaveLength(0);

    const overview = calculateBudgetOverview(100_000_000, reloaded);
    expect(overview.totalSpent).toBe(0);
    expect(overview.totalRemaining).toBe(100_000_000);
  });

  it('4. Workspace Isolation: Expenses from Workspace A never leak into Workspace B', async () => {
    const inMemoryDb: Record<string, BudgetExpense[]> = {
      [workspaceA]: [
        {
          id: 'exp-a',
          title: 'Workspace A Catering',
          category: 'catering',
          amount: 5_000_000,
          date: '2026-09-03',
          note: null,
          createdAt: '',
          updatedAt: '',
        },
      ],
      [workspaceB]: [
        {
          id: 'exp-b',
          title: 'Workspace B Venue',
          category: 'venue',
          amount: 20_000_000,
          date: '2026-09-03',
          note: null,
          createdAt: '',
          updatedAt: '',
        },
      ],
    };

    vi.spyOn(supabaseBudgetAdapter, 'fetchBudgetByWorkspaceId').mockImplementation(
      async (wsId: string) => ({
        allocations: [],
        expenses: inMemoryDb[wsId] || [],
      })
    );

    const budgetA = await workspaceRepository.getBudget(workspaceA);
    const budgetB = await workspaceRepository.getBudget(workspaceB);

    expect(budgetA.expenses).toHaveLength(1);
    expect(budgetA.expenses[0].title).toBe('Workspace A Catering');
    expect(budgetA.expenses.some((e) => e.title.includes('Workspace B'))).toBe(false);

    expect(budgetB.expenses).toHaveLength(1);
    expect(budgetB.expenses[0].title).toBe('Workspace B Venue');
    expect(budgetB.expenses.some((e) => e.title.includes('Workspace A'))).toBe(false);
  });
});
