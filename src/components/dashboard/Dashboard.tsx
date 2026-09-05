import React from 'react';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { WeddingHeader } from './WeddingHeader';
import { BrandMark } from '../brand';
import { NextBestActionCard } from './NextBestActionCard';
import { UpcomingTasks } from './UpcomingTasks';
import { BudgetGuestSummaryPanel } from './BudgetGuestSummaryPanel';
import { PreparationCategories } from './PreparationCategories';
import { TimelinePreview } from './TimelinePreview';
import { AccessStatusBanner } from '../access/AccessStatusBanner';
import { useCustomerEntitlement } from '../../hooks/useCustomerEntitlement';
import { WorkspaceViewModel } from '../../types/workspace';
import { TaskItem, TaskCategoryId } from '../../types/checklist';
import { CategoryId } from '../../types/onboarding';
import { StoredBudget } from '../../types/budget';
import { calculateBudgetOverview } from '../../domain/budgetSelectors';
import { derivePreparationJourney } from '../../domain/journeySelectors';
import { Sparkles } from 'lucide-react';

export interface DashboardProps {
  workspace: WorkspaceViewModel;
  tasks: TaskItem[];
  budget: StoredBudget;
  onTaskChange: (updatedTasks: TaskItem[]) => void;
  currentModule: string;
  onNavigateModule: (targetModule: string, initialFilter?: TaskCategoryId | 'all') => void;
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
  // Retrieve live customer access entitlement state
  const { entitlement, isLoading: isEntitlementLoading } = useCustomerEntitlement(workspace.id);

  // NBA is pre-computed in WorkspaceViewModel
  const nextBestAction = workspace.nextBestAction;

  const budgetOverview = calculateBudgetOverview(workspace.estimatedBudget, budget);

  // Dynamic Contextual Insight for the lower dashboard
  const journey = derivePreparationJourney(workspace.weddingDate, tasks);
  const currentPhase = journey.phases.find((p) => p.isCurrent);

  let tipHeading = 'Perhatikan ini';
  let tipMessage = 'Catering dan dekorasi menjadi fokus utama di fase persiapanmu saat ini. Amankan vendor terlebih dahulu sebelum masuk ke persiapan berikutnya.';

  if (currentPhase && currentPhase.title) {
    tipMessage = `${currentPhase.title} menjadi fokus utama di fase persiapanmu saat ini. Amankan vendor terlebih dahulu sebelum masuk ke persiapan berikutnya.`;
  } else if (nextBestAction?.title) {
    tipMessage = `${nextBestAction.title} perlu menjadi fokus utamamu saat ini. Selesaikan langkah ini untuk memperlancar alur persiapan selanjutnya.`;
  } else if (workspace.daysUntilWedding <= 30 && workspace.daysUntilWedding > 0) {
    tipHeading = 'Fokus H-30';
    tipMessage = `Waktu persiapan menuju Hari-H tersisa ${workspace.daysUntilWedding} hari. Prioritaskan konfirmasi final vendor dan kelengkapan administrasi.`;
  }

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

      {/* Main Dashboard Workspace Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        
        {/* Mobile Header Bar */}
        <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-beige py-3 px-4 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <BrandMark size="sm" />
            <span className="font-serif text-lg font-bold text-charcoal">
              Wed<span className="text-burgundy">Siap</span>
            </span>
          </div>

          <span className="text-[10px] font-semibold text-charcoal-500 bg-ivory-100 px-2.5 py-1 rounded-full border border-beige">
            {workspace.coupleName}
          </span>
        </header>

        {/* Dashboard Main Content Body */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 max-w-[1440px] 2xl:max-w-[1536px] mx-auto w-full space-y-6 sm:space-y-8">
          
          {/* LEVEL 1: Header / Wedding Overview */}
          <WeddingHeader
            workspace={workspace}
            onRestartOnboarding={onRestartOnboarding}
          />

          {/* Customer Access Tier & Trial / Pass Status Banner */}
          <AccessStatusBanner
            entitlement={entitlement}
            isLoading={isEntitlementLoading}
            onUpgradeClick={() => onNavigateModule('checkout')}
          />

          {/* LEVEL 2: Langkahmu Berikutnya (Primary Recommendation Focal Point) */}
          <NextBestActionCard
            action={nextBestAction}
            userPriority={workspace.primaryPlanningPriority}
            onTakeAction={(target) => onNavigateModule(target)}
          />

          {/* LEVEL 3 & 5: Row 1 — Tugas Berikutnya (Left) + Snapshot (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-7 xl:col-span-7 flex flex-col">
              <UpcomingTasks
                tasks={tasks}
                onTaskChange={onTaskChange}
                onViewAllChecklist={() => onNavigateModule('checklist')}
              />
            </div>

            <div className="lg:col-span-5 xl:col-span-5 flex flex-col">
              <BudgetGuestSummaryPanel
                estimatedBudget={workspace.estimatedBudget}
                totalSpent={budgetOverview.totalSpent}
                totalRemaining={budgetOverview.totalRemaining}
                hasExpenses={budget.expenses.length > 0}
                guestCount={workspace.estimatedGuestCount}
                onViewBudget={() => onNavigateModule('budget')}
                onViewGuests={() => onNavigateModule('guests')}
              />
            </div>
          </div>

          {/* LOWER SECTION: LEVEL 4 & 6 — Status Persiapan Modul (Left) + Perjalanan Menuju Hari-H (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Seberapa siap aku? (Status Persiapan Modul) */}
            <div className="lg:col-span-7 xl:col-span-7 flex flex-col">
              <PreparationCategories
                tasks={tasks}
                nextBestActionCategory={nextBestAction.category}
                onCategoryClick={(catId: CategoryId) => onNavigateModule('checklist', catId)}
                onViewAllChecklist={() => onNavigateModule('checklist')}
              />
            </div>

            {/* Aku sedang berada di fase mana? (Timeline / Perjalanan Menuju Hari-H) */}
            <div className="lg:col-span-5 xl:col-span-5 flex flex-col">
              <TimelinePreview
                workspace={workspace}
                tasks={tasks}
                onViewTimeline={() => onNavigateModule('timeline')}
                onNavigateSettings={() => onNavigateModule('settings')}
                onNavigateChecklist={() => onNavigateModule('checklist')}
              />
            </div>
          </div>

          {/* LOWER SECTION: LEVEL 7 — Contextual Tip: "Apa yang perlu aku perhatikan?" */}
          <div className="p-4 sm:p-5 rounded-2xl bg-ivory-50/90 border border-beige flex items-start sm:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-gold-100 border border-gold-200/80 flex items-center justify-center text-gold-800 shrink-0 mt-0.5 sm:mt-0">
                <Sparkles className="w-4 h-4 text-gold-700" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gold-700 block">
                  {tipHeading}
                </span>
                <p className="text-xs sm:text-sm text-charcoal-600 mt-0.5 leading-relaxed">
                  {tipMessage}
                </p>
              </div>
            </div>
          </div>

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
