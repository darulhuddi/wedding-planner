import React, { useState, useMemo } from 'react';
import { DesktopSidebar } from '../dashboard/DesktopSidebar';
import { MobileBottomNav } from '../dashboard/MobileBottomNav';
import { MobileModuleHeader } from '../layout/MobileModuleHeader';
import { PageHeader } from '../ui/PageHeader';
import { BudgetOverviewCard } from './BudgetOverviewCard';
import { BudgetDonutChart } from './BudgetDonutChart';
import { BudgetHealthInsightCard } from './BudgetHealthInsightCard';
import { BudgetSpendingTrendChart } from './BudgetSpendingTrendChart';
import { BudgetTopExpensesCard } from './BudgetTopExpensesCard';
import { BudgetUpcomingPaymentsCard } from './BudgetUpcomingPaymentsCard';
import { BudgetProjectionCard } from './BudgetProjectionCard';
import { BudgetAllocationList } from './BudgetAllocationList';
import { BudgetExpenseList } from './BudgetExpenseList';
import { ExpenseModal } from './ExpenseModal';
import { EditBudgetModal } from './EditBudgetModal';
import { BudgetStarterTemplateModal } from './BudgetStarterTemplateModal';

import { WorkspaceViewModel, StoredWorkspace } from '../../types/workspace';
import { StoredBudget, BudgetCategory, BudgetExpense, BudgetAllocation } from '../../types/budget';
import { Vendor } from '../../types/vendor';
import { TaskItem } from '../../types/checklist';
import {
  calculateBudgetOverview,
  calculateCategorySummaries,
  calculateBudgetDistribution,
  calculateSpendingTrend,
  calculateTopSpendingCategories,
  getBudgetHealthAssessment,
  getBudgetInsights,
  calculateUpcomingPayments,
  calculateBudgetProjection,
} from '../../domain/budgetSelectors';
import { Wallet, Sparkles, X } from 'lucide-react';

export interface BudgetPageProps {
  workspace: WorkspaceViewModel;
  budget: StoredBudget;
  vendors?: Vendor[];
  tasks?: TaskItem[];
  onWorkspaceChange: (workspace: StoredWorkspace) => void;
  onBudgetChange: (budget: StoredBudget) => void;
  currentModule: string;
  onNavigateModule: (targetModule: string) => void;
}

export const BudgetPage: React.FC<BudgetPageProps> = ({
  workspace,
  budget,
  vendors = [],
  tasks = [],
  onWorkspaceChange,
  onBudgetChange,
  currentModule,
  onNavigateModule,
}) => {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<BudgetExpense | null>(null);
  const [isEditBudgetModalOpen, setIsEditBudgetModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isOverwriteConfirmOpen, setIsOverwriteConfirmOpen] = useState(false);

  // Pure Derivations
  const overview = useMemo(
    () => calculateBudgetOverview(workspace.estimatedBudget, budget),
    [workspace.estimatedBudget, budget]
  );
  
  const categorySummaries = useMemo(
    () => calculateCategorySummaries(budget),
    [budget]
  );

  const budgetDistribution = useMemo(
    () => calculateBudgetDistribution(workspace.estimatedBudget, budget),
    [workspace.estimatedBudget, budget]
  );

  const spendingTrend = useMemo(
    () => calculateSpendingTrend(budget, workspace.weddingDate, workspace.estimatedBudget),
    [budget, workspace.weddingDate, workspace.estimatedBudget]
  );

  const topSpendingCategories = useMemo(
    () => calculateTopSpendingCategories(budget, workspace.estimatedBudget, 5),
    [budget, workspace.estimatedBudget]
  );

  const budgetProjection = useMemo(
    () => calculateBudgetProjection(workspace.estimatedBudget, budget, vendors),
    [workspace.estimatedBudget, budget, vendors]
  );

  const healthAssessment = useMemo(
    () => getBudgetHealthAssessment(overview, budget.expenses.length, budgetProjection),
    [overview, budget.expenses.length, budgetProjection]
  );

  const detailedInsights = useMemo(
    () => getBudgetInsights(overview, categorySummaries),
    [overview, categorySummaries]
  );

  const upcomingPayments = useMemo(
    () => calculateUpcomingPayments(vendors, tasks, budget),
    [vendors, tasks, budget]
  );

  // Handlers
  const handleUpdateTotalBudget = (newBudget: number) => {
    onWorkspaceChange({
      ...workspace,
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

  const handleApplyStarterTemplate = (starterAllocations: BudgetAllocation[]) => {
    onBudgetChange({
      ...budget,
      allocations: starterAllocations,
    });
  };

  const handleRequestStarterTemplate = () => {
    if (budget.allocations.length > 0) {
      setIsOverwriteConfirmOpen(true);
    } else {
      setIsTemplateModalOpen(true);
    }
  };

  const handleConfirmOverwrite = () => {
    setIsOverwriteConfirmOpen(false);
    setIsTemplateModalOpen(true);
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

  const handleScrollToAllocations = () => {
    const el = document.getElementById('budget-allocation-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-ivory text-charcoal flex flex-col md:flex-row selection:bg-burgundy-100 selection:text-burgundy-900 pb-20 md:pb-8">
      {/* Desktop App Sidebar */}
      <DesktopSidebar
        currentModule={currentModule}
        onNavigate={onNavigateModule}
        coupleName={workspace.coupleName}
        weddingDate={workspace.weddingDate}
        workspaceId={workspace.id}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Header Bar */}
        <MobileModuleHeader
          title="Budget"
          icon={<Wallet className="w-4 h-4 text-burgundy" />}
          onBack={() => onNavigateModule('dashboard')}
        />

        {/* Main Content Dashboard */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 max-w-[1200px] mx-auto w-full space-y-6 sm:space-y-8">
          
          {/* Standardized Page Header */}
          <PageHeader
            eyebrow="ANGGARAN PERNIKAHAN"
            title="Budget & Pengeluaran"
            description="Kelola alokasi dan pantau pengeluaran pernikahanmu dengan tenang, cerdas, dan terkontrol."
          />

          {/* 1. Hero: Total Budget & Progress Bar */}
          <BudgetOverviewCard
            overview={overview}
            onEditBudget={() => setIsEditBudgetModalOpen(true)}
          />

          {/* 2. Distribusi Budget Donut Chart + Budget Health & Insight (2-Column Grid) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <BudgetDonutChart
              distribution={budgetDistribution}
              onOpenStarterTemplate={handleRequestStarterTemplate}
            />
            <BudgetHealthInsightCard
              assessment={healthAssessment}
              detailedInsights={detailedInsights}
              onScrollToAllocations={handleScrollToAllocations}
              onAddExpense={handleAddExpenseClick}
            />
          </div>

          {/* 3. Tren Pengeluaran (Spending Trend Line/Area Chart) */}
          <BudgetSpendingTrendChart
            trendData={spendingTrend}
            onAddExpense={handleAddExpenseClick}
          />

          {/* 4. Pengeluaran Terbesar + Pembayaran Mendatang (2-Column Grid) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <BudgetTopExpensesCard
              topCategories={topSpendingCategories}
              totalSpent={overview.totalSpent}
              onAddExpense={handleAddExpenseClick}
            />
            <BudgetUpcomingPaymentsCard
              upcomingPayments={upcomingPayments}
              onNavigateToVendors={() => onNavigateModule('vendor')}
              onNavigateToChecklist={() => onNavigateModule('checklist')}
            />
          </div>

          {/* 5. Proyeksi Budget (Strategic Feasibility Feature) */}
          <BudgetProjectionCard
            projection={budgetProjection}
            onOpenStarterTemplate={handleRequestStarterTemplate}
            onNavigateToVendors={() => onNavigateModule('vendor')}
          />

          {/* 6. Alokasi Budget Section (Existing Configuration) */}
          <div id="budget-allocation-section">
            <BudgetAllocationList
              categorySummaries={categorySummaries}
              totalAllocated={overview.totalAllocated}
              totalBudget={overview.totalBudget}
              onUpdateAllocation={handleUpdateAllocation}
              onOpenStarterTemplate={handleRequestStarterTemplate}
            />
          </div>

          {/* 7. Main Operational Section: Pengeluaran (Existing Expense List) */}
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

      {/* Confirmation Modal when replacing existing allocations */}
      {isOverwriteConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-overwrite-title"
        >
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-beige-300 shadow-xl w-full max-w-md overflow-hidden p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-burgundy-50 border border-burgundy-100 flex items-center justify-center text-burgundy shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 id="confirm-overwrite-title" className="font-serif text-lg sm:text-xl font-bold text-charcoal">
                  Gunakan Contoh Pembagian?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOverwriteConfirmOpen(false)}
                className="p-1.5 text-charcoal-400 hover:text-charcoal rounded-lg hover:bg-ivory-100 transition-colors cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-charcoal-500 leading-relaxed">
              Pembagian budget yang sedang kamu gunakan akan diganti dengan pembagian baru. Kamu tetap bisa menyesuaikan persentasenya sebelum menerapkan.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-beige">
              <button
                type="button"
                onClick={() => setIsOverwriteConfirmOpen(false)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-charcoal-500 hover:text-charcoal hover:bg-ivory-100 transition-colors cursor-pointer min-h-touch"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmOverwrite}
                className="px-5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-burgundy text-white hover:bg-burgundy-700 transition-colors shadow-xs cursor-pointer min-h-touch"
              >
                Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      <BudgetStarterTemplateModal
        isOpen={isTemplateModalOpen}
        estimatedBudget={workspace.estimatedBudget}
        onClose={() => setIsTemplateModalOpen(false)}
        onApplyTemplate={handleApplyStarterTemplate}
        onOpenEditBudget={() => setIsEditBudgetModalOpen(true)}
      />
    </div>
  );
};
