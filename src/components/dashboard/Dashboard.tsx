import React from 'react';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { WeddingHeader } from './WeddingHeader';
import { NextBestActionCard } from './NextBestActionCard';
import { PreparationProgress } from './PreparationProgress';
import { UpcomingTasks } from './UpcomingTasks';
import { BudgetSnapshot } from './BudgetSnapshot';
import { GuestSnapshot } from './GuestSnapshot';
import { PreparationCategories } from './PreparationCategories';
import { TimelinePreview } from './TimelinePreview';
import { WorkspaceViewModel } from '../../types/workspace';
import { TaskItem } from '../../types/checklist';
import { CategoryId } from '../../types/onboarding';
import { StoredBudget } from '../../types/budget';
import { calculateBudgetOverview } from '../../domain/budgetSelectors';

export interface DashboardProps {
  workspace: WorkspaceViewModel;
  tasks: TaskItem[];
  budget: StoredBudget;
  onTaskChange: (updatedTasks: TaskItem[]) => void;
  currentModule: string;
  onNavigateModule: (targetModule: string) => void;
  onRestartOnboarding: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  workspace,
  tasks,
  budget,
  onTaskChange,
  currentModule,
  onNavigateModule,
  onRestartOnboarding,
}) => {
  // NBA is pre-computed in WorkspaceViewModel — no engine call needed here
  const nextBestAction = workspace.nextBestAction;

  const budgetOverview = calculateBudgetOverview(workspace.estimatedBudget, budget);

  return (
    <div className="min-h-screen bg-ivory text-charcoal flex flex-col md:flex-row selection:bg-burgundy-100 selection:text-burgundy-900 pb-20 md:pb-8">
      
      {/* Desktop App Sidebar */}
      <DesktopSidebar
        currentModule={currentModule}
        onNavigate={onNavigateModule}
        coupleName={workspace.coupleName}
      />

      {/* Main Dashboard Workspace Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        
        {/* Mobile Header Bar */}
        <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-beige py-3 px-4 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-burgundy flex items-center justify-center text-ivory">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="12" r="5" stroke="#FAF8F3" strokeWidth="1.8" />
                <circle cx="15" cy="12" r="5" stroke="#B89A70" strokeWidth="1.8" />
              </svg>
            </div>
            <span className="font-serif text-lg font-bold text-charcoal">
              Wed<span className="text-burgundy">Flow</span>
            </span>
          </div>

          <span className="text-[10px] font-semibold text-burgundy bg-burgundy-50 px-2 py-0.5 rounded border border-burgundy-100">
            Workspace Overview
          </span>
        </header>

        {/* Dashboard Main Content Body - Responsive Content Container for Wide Desktop */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 max-w-[1440px] 2xl:max-w-[1536px] mx-auto w-full space-y-6 sm:space-y-7">
          
          {/* SECTION 1: Wedding Header */}
          <WeddingHeader
            workspace={workspace}
            onRestartOnboarding={onRestartOnboarding}
          />

          {/* SECTION 2: Next Best Action Card */}
          <NextBestActionCard
            action={nextBestAction}
            userPriority={workspace.primaryPlanningPriority}
            onTakeAction={(target) => onNavigateModule(target)}
          />

          {/* SECTION 3: Preparation Progress */}
          <PreparationProgress
            completedCount={workspace.completedCategoriesCount}
            totalCount={workspace.totalCategoriesCount}
            completionPercentage={workspace.completionPercentage}
          />

          {/* SECTION 4 & 5: Responsive Summary Grid (Upcoming + Budget + Tamu) */}
          {/* On large desktop (lg/xl), places Upcoming (6 cols), Budget (3 cols), and Tamu (3 cols) in 1 horizontal row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
            
            {/* Upcoming Tasks — receives shared task state from App.tsx */}
            <div className="lg:col-span-6 xl:col-span-6">
              <UpcomingTasks
                tasks={tasks}
                onTaskChange={onTaskChange}
                onViewAllChecklist={() => onNavigateModule('checklist')}
              />
            </div>

            {/* Budget Snapshot (1 col on large desktop, 3 out of 12) */}
            <div className="lg:col-span-3 xl:col-span-3">
              <BudgetSnapshot
                formattedBudget={workspace.formattedBudget}
                totalSpent={budgetOverview.totalSpent}
                totalRemaining={budgetOverview.totalRemaining}
                hasExpenses={budget.expenses.length > 0}
                onViewBudget={() => onNavigateModule('budget')}
              />
            </div>

            {/* Guest Snapshot (1 col on large desktop, 3 out of 12) */}
            <div className="lg:col-span-3 xl:col-span-3">
              <GuestSnapshot
                guestCount={workspace.estimatedGuestCount}
                onViewGuests={() => onNavigateModule('guests')}
              />
            </div>

          </div>

          {/* SECTION 6: Preparation Categories */}
          <PreparationCategories
            tasks={tasks}
            onCategoryClick={(catId: CategoryId) => onNavigateModule(catId)}
          />

          {/* SECTION 7: Timeline Preview */}
          <TimelinePreview
            onViewTimeline={() => onNavigateModule('timeline')}
          />

        </main>

      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        currentModule={currentModule}
        onNavigate={onNavigateModule}
      />

    </div>
  );
};
