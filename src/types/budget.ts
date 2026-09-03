import { CategoryId } from './onboarding';

/**
 * Budget Category encompasses all vendor categories + 'general'.
 */
export type BudgetCategory = CategoryId | 'general';

export interface BudgetAllocation {
  id: string;
  category: BudgetCategory;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetExpense {
  id: string;
  title: string;
  category: BudgetCategory;
  amount: number;
  date: string; // YYYY-MM-DD
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Canonical stored budget shape.
 * There is only ONE canonical budget per workspace.
 */
export interface StoredBudget {
  allocations: BudgetAllocation[];
  expenses: BudgetExpense[];
}
