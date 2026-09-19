import React from 'react';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { WeddingHeader } from './WeddingHeader';
import { BrandMark } from '../brand';
import { UpcomingTasks } from './UpcomingTasks';
import { BudgetSnapshot } from './BudgetSnapshot';
import { SeserahanSnapshot, SeserahanSummaryData } from './SeserahanSnapshot';
import { getSeserahanMetrics } from '../../repositories/workspaceRepository';
import { PreparationCategories } from './PreparationCategories';
import { TimelinePreview } from './TimelinePreview';
import { AccessStatusBanner } from '../access/AccessStatusBanner';
import { useCustomerEntitlement } from '../../hooks/useCustomerEntitlement';
import { StoredWorkspace, WorkspaceViewModel } from '../../types/workspace';
import { TaskItem, TaskCategoryId } from '../../types/checklist';
import { CategoryId } from '../../types/onboarding';
import { StoredBudget } from '../../types/budget';
import { WeddingEvent } from '../../domain/events';
import { calculateBudgetOverview } from '../../domain/budgetSelectors';
import { derivePreparationJourney } from '../../domain/journeySelectors';
import { Sparkles, ArrowRight } from 'lucide-react';
import { WeddingIdentityModal } from './WeddingIdentityModal';
import { DashboardEventsOverview } from './DashboardEventsOverview';
import { EventsManagementModal } from '../events/EventsManagementModal';
import { AiInsightModal } from './AiInsightModal';

export interface DashboardProps {
  workspace: WorkspaceViewModel;
  storedWorkspace?: StoredWorkspace;
  tasks: TaskItem[];
  budget: StoredBudget;
  events?: WeddingEvent[];
  onWorkspaceChange?: (updated: StoredWorkspace) => Promise<void> | void;
  onTaskChange: (updatedTasks: TaskItem[]) => void;
  onEventCreate?: (eventData: Omit<WeddingEvent, 'id' | 'createdAt' | 'updatedAt' | 'workspaceId'>) => Promise<void | WeddingEvent>;
  onEventUpdate?: (eventId: string, changes: Partial<WeddingEvent>) => Promise<void | WeddingEvent>;
  onEventDelete?: (eventId: string) => Promise<void>;
  currentModule: string;
  onNavigateModule: (targetModule: string, initialFilter?: TaskCategoryId | 'all') => void;
  onRestartOnboarding: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  workspace,
  storedWorkspace,
  tasks,
  budget,
  events = [],
  onWorkspaceChange,
  onTaskChange,
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  currentModule,
  onNavigateModule,
  onRestartOnboarding,
}) => {
  const [isIdentityModalOpen, setIsIdentityModalOpen] = React.useState(false);
  const [isEventsModalOpen, setIsEventsModalOpen] = React.useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = React.useState(false);
  const [seserahanData, setSeserahanData] = React.useState<SeserahanSummaryData | null>(null);

  React.useEffect(() => {
    let isCancelled = false;
    const wsId = storedWorkspace?.id || workspace.id;
    if (!wsId) return;

    (async () => {
      try {
        const metrics = await getSeserahanMetrics(wsId);
        if (isCancelled) return;
        if (metrics.totalItems > 0) {
          setSeserahanData({
            totalItems: metrics.totalItems,
            completedItems: metrics.completedItems,
            totalBudget: metrics.budget,
            spentBudget: metrics.actualTotal,
          });
        } else {
          setSeserahanData(null);
        }
      } catch (err) {
        console.error('[Dashboard] Failed to load seserahan metrics:', err);
        if (!isCancelled) setSeserahanData(null);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [storedWorkspace?.id, workspace.id]);

  // Retrieve live customer access entitlement state
  const { entitlement, isLoading: isEntitlementLoading } = useCustomerEntitlement(workspace.id);

  // NBA is pre-computed in WorkspaceViewModel
  const nextBestAction = workspace.nextBestAction;

  // Dynamic Contextual Insight for the lower dashboard
  const journey = derivePreparationJourney(workspace.weddingDate, tasks);
  const currentPhase = journey.phases.find((p) => p.isCurrent);

  let tipHeading = 'PERHATIKAN INI';
  let tipMessage = 'Catering dan dekorasi menjadi fokus utama persiapanmu saat ini.';

  if (currentPhase && currentPhase.title) {
    tipMessage = `${currentPhase.title} menjadi fokus utama persiapanmu saat ini.`;
  } else if (nextBestAction?.title) {
    tipMessage = `${nextBestAction.title} menjadi fokus utama persiapanmu saat ini.`;
  } else if (workspace.daysUntilWedding <= 30 && workspace.daysUntilWedding > 0) {
    tipHeading = 'FOKUS H-30';
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
        <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 max-w-[1440px] 2xl:max-w-[1536px] mx-auto w-full space-y-5 sm:space-y-6">
          
          {/* SECTION 1: Header / Wedding Overview */}
          <WeddingHeader
            workspace={workspace}
            onRestartOnboarding={onRestartOnboarding}
            onEditIdentity={
              storedWorkspace && onWorkspaceChange
                ? () => setIsIdentityModalOpen(true)
                : undefined
            }
          />

          {/* Customer Access Tier & Trial / Pass Status Banner (Compact) */}
          <AccessStatusBanner
            entitlement={entitlement}
            isLoading={isEntitlementLoading}
            onUpgradeClick={() => onNavigateModule('checkout')}
          />

          {/* SECTION 2: Tugas Berikutnya (Left, ~60%) + Snapshot Budget (Right, ~40%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
            <div className="lg:col-span-7 xl:col-span-7 flex flex-col">
              <UpcomingTasks
                tasks={tasks}
                onTaskChange={onTaskChange}
                onViewAllChecklist={() => onNavigateModule('checklist')}
                onOpenAiInsight={() => setIsAiModalOpen(true)}
              />
            </div>

            <div className="lg:col-span-5 xl:col-span-5 flex flex-col">
              <BudgetSnapshot
                totalBudget={workspace.estimatedBudget}
                budget={budget}
                weddingDate={workspace.weddingDate}
                onViewBudget={() => onNavigateModule('budget')}
              />
            </div>
          </div>

          {/* SECTION 3: Seserahan (Left) + Rangkaian Acara (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
            <div className="lg:col-span-6 xl:col-span-6 flex flex-col">
              <SeserahanSnapshot
                data={seserahanData}
                onViewDetails={() => onNavigateModule('seserahan')}
              />
            </div>

            <div className="lg:col-span-6 xl:col-span-6 flex flex-col">
              <DashboardEventsOverview
                events={events}
                onOpenEventsModal={() => setIsEventsModalOpen(true)}
              />
            </div>
          </div>

          {/* SECTION 4: Status Persiapan Modul (Left) + Perjalanan Menuju Hari-H (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
            <div className="lg:col-span-6 xl:col-span-6 flex flex-col">
              <PreparationCategories
                tasks={tasks}
                nextBestActionCategory={nextBestAction?.category}
                onCategoryClick={(catId: CategoryId) => onNavigateModule('checklist', catId)}
                onViewAllChecklist={() => onNavigateModule('checklist')}
              />
            </div>

            <div className="lg:col-span-6 xl:col-span-6 flex flex-col">
              <TimelinePreview
                workspace={workspace}
                tasks={tasks}
                onViewTimeline={() => onNavigateModule('timeline')}
                onNavigateSettings={() => onNavigateModule('settings')}
                onNavigateChecklist={() => onNavigateModule('checklist')}
              />
            </div>
          </div>

          {/* SECTION 5: Single Contextual Insight / Attention Bar */}
          {nextBestAction && (
            <div className="p-4 sm:p-5 rounded-2xl bg-ivory-50/90 border border-beige flex items-start sm:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gold-100 border border-gold-200/80 flex items-center justify-center text-gold-800 shrink-0 mt-0.5 sm:mt-0">
                  <Sparkles className="w-4 h-4 text-gold-700" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gold-700 block">
                      {tipHeading}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAiModalOpen(true)}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gold-100/70 hover:bg-gold-200/80 text-gold-800 border border-gold-300/70 transition-colors cursor-pointer"
                      title="Pelajari tentang AI Insight"
                    >
                      <span>✦ AI Insight</span>
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-charcoal-600 mt-0.5 leading-relaxed">
                    {tipMessage}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const target = nextBestAction.target || (nextBestAction.type === 'administration' ? 'administration' : 'checklist');
                  onNavigateModule(target);
                }}
                className="text-xs font-semibold text-burgundy hover:text-burgundy-800 inline-flex items-center gap-1 shrink-0 cursor-pointer transition-colors whitespace-nowrap pl-2"
              >
                <span>Lihat tugas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

        </main>

      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        currentModule={currentModule}
        onNavigate={onNavigateModule}
      />

      {/* AI Insight Transparency Modal */}
      <AiInsightModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />

      {/* Wedding Identity Edit Modal */}
      {storedWorkspace && onWorkspaceChange && (
        <WeddingIdentityModal
          isOpen={isIdentityModalOpen}
          onClose={() => setIsIdentityModalOpen(false)}
          storedWorkspace={storedWorkspace}
          onWorkspaceChange={onWorkspaceChange}
        />
      )}

      {/* Events Management Modal */}
      {onEventCreate && onEventUpdate && onEventDelete && (
        <EventsManagementModal
          isOpen={isEventsModalOpen}
          onClose={() => setIsEventsModalOpen(false)}
          events={events}
          onEventCreate={onEventCreate}
          onEventUpdate={onEventUpdate}
          onEventDelete={onEventDelete}
        />
      )}

    </div>
  );
};
