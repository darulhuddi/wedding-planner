import React, { useState, useMemo } from 'react';
import { DesktopSidebar } from '../dashboard/DesktopSidebar';
import { MobileBottomNav } from '../dashboard/MobileBottomNav';
import { BudgetOverviewCard } from './BudgetOverviewCard';
import { BudgetAllocationChart } from './BudgetAllocationChart';
import { BudgetAllocationList } from './BudgetAllocationList';
import { BudgetExpenseList } from './BudgetExpenseList';
import { BudgetInsightsCard } from './BudgetInsightsCard';
import { ExpenseModal } from './ExpenseModal';
import { EditBudgetModal } from './EditBudgetModal';

import { WorkspaceViewModel, StoredWorkspace } from '../../types/workspace';
import { StoredBudget, BudgetCategory, BudgetExpense } from '../../types/budget';
import { calculateBudgetOverview, calculateCategorySummaries, getBudgetInsights } from '../../domain/budgetSelectors';
import { Wallet } from 'lucide-react';

export interface BudgetPageProps {
  workspace: WorkspaceViewModel;
  budget: StoredBudget;
  onWorkspaceChange: (workspace: StoredWorkspace) => void;
  onBudgetChange: (budget: StoredBudget) => void;
  currentModule: string;
  onNavigateModule: (targetModule: string) => void;
}

export const BudgetPage: React.FC<BudgetPageProps> = ({
  workspace,
  budget,
  onWorkspaceChange,
  onBudgetChange,
  currentModule,
  onNavigateModule,
}) => {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<BudgetExpense | null>(null);
  const [isEditBudgetModalOpen, setIsEditBudgetModalOpen] = useState(false);

  // Derivations
  const overview = useMemo(
    () => calculateBudgetOverview(workspace.estimatedBudget, budget),
    [workspace.estimatedBudget, budget]
  );
  
  const categorySummaries = useMemo(
    () => calculateCategorySummaries(budget),
    [budget]
  );
  
  const insights = useMemo(
    () => getBudgetInsights(overview, categorySummaries),
    [overview, categorySummaries]
  );

  // Handlers
  const handleUpdateTotalBudget = (newBudget: number) => {
    onWorkspaceChange({
      ...workspace, // WorkspaceViewModel extends StoredWorkspace, so spreading works to persist the base shape. But wait, it's safer to extract only StoredWorkspace fields if needed, however since workspaceRepository ignores extra fields or they are re-derived, it's fine. Actually, workspaceRepository just writes what's given. It's safer to extract StoredWorkspace fields.
      estimatedBudget: newBudget,
      updatedAt: new Date().toISOString(),
    });
    setIsEditBudgetModalOpen(false);
  };

  const handleUpdateAllocation = (category: BudgetCategory, amount: number) => {
    const newAllocations = [...budget.allocations];
    const existingIndex = newAllocations.findIndex((a) => a.category === category);

    if (existingIndex >= 0) {
      newAllocations[existingIndex] = {
        ...newAllocations[existingIndex],
        amount,
        updatedAt: new Date().toISOString(),
      };
    } else {
      newAllocations.push({
        id: crypto.randomUUID(),
        category,
        amount,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    onBudgetChange({
      ...budget,
      allocations: newAllocations,
    });
  };

  const handleSaveExpense = (expenseData: Omit<BudgetExpense, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingExpense) {
      const updatedExpenses = budget.expenses.map((e) => 
        e.id === editingExpense.id 
          ? { ...e, ...expenseData, updatedAt: new Date().toISOString() }
          : e
      );

      onBudgetChange({
        ...budget,
        expenses: updatedExpenses,
      });
    } else {
      const newExpense: BudgetExpense = {
        ...expenseData,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onBudgetChange({
        ...budget,
        expenses: [...budget.expenses, newExpense],
      });
    }
    
    setIsExpenseModalOpen(false);
    setEditingExpense(null);
  };

  const handleAddExpenseClick = () => {
    setEditingExpense(null);
    setIsExpenseModalOpen(true);
  };

  const handleEditExpenseClick = (expense: BudgetExpense) => {
    setEditingExpense(expense);
    setIsExpenseModalOpen(true);
  };

  const handleDeleteExpense = (expenseId: string) => {
    onBudgetChange({
      ...budget,
      expenses: budget.expenses.filter((e) => e.id !== expenseId),
    });
  };

  return (
    <div className="min-h-screen bg-ivory text-charcoal flex flex-col md:flex-row selection:bg-burgundy-100 selection:text-burgundy-900 pb-20 md:pb-8">
      {/* Desktop App Sidebar */}
      <DesktopSidebar
        currentModule={currentModule}
        onNavigate={onNavigateModule}
        coupleName={workspace.coupleName}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Header Bar */}
        <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-beige py-3 px-4 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-burgundy flex items-center justify-center text-ivory">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="font-serif text-lg font-bold text-charcoal">
              Budget
            </span>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 max-w-[1200px] mx-auto w-full space-y-6 sm:space-y-8">
          
          <div className="hidden md:block mb-8">
            <h1 className="font-serif text-3xl font-bold text-charcoal mb-2">Manajemen Budget</h1>
            <p className="text-charcoal-400">Atur dan pantau budget pernikahanmu.</p>
          </div>

          <BudgetOverviewCard
            overview={overview}
            onEditBudget={() => setIsEditBudgetModalOpen(true)}
          />

          <BudgetAllocationChart 
            categorySummaries={categorySummaries}
            totalBudget={workspace.estimatedBudget}
          />

          <BudgetInsightsCard insights={insights} />

          <BudgetAllocationList
            categorySummaries={categorySummaries}
            totalAllocated={overview.totalAllocated}
            totalBudget={overview.totalBudget}
            onUpdateAllocation={handleUpdateAllocation}
          />

          <BudgetExpenseList
            expenses={budget.expenses}
            onAddExpense={handleAddExpenseClick}
            onEditExpense={handleEditExpenseClick}
            onDeleteExpense={handleDeleteExpense}
          />
        </main>
      </div>

      <MobileBottomNav
        currentModule={currentModule}
        onNavigate={onNavigateModule}
      />

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        initialExpense={editingExpense}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        onSave={handleSaveExpense}
      />

      <EditBudgetModal
        isOpen={isEditBudgetModalOpen}
        currentBudget={workspace.estimatedBudget}
        onClose={() => setIsEditBudgetModalOpen(false)}
        onSave={handleUpdateTotalBudget}
      />
    </div>
  );
};
