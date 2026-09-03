import React, { useState, useEffect } from 'react';
import { OnboardingLayout } from './OnboardingLayout';
import { CoupleStep } from './CoupleStep';
import { WeddingDateStep } from './WeddingDateStep';
import { WeddingOverviewStep } from './WeddingOverviewStep';
import { PreparationStep } from './PreparationStep';
import { PriorityStep } from './PriorityStep';
import { WorkspaceReadyStep } from './WorkspaceReadyStep';
import { OnboardingData, PlanningPriority, CategoryId } from '../../types/onboarding';
import { WorkspaceViewModel, StoredWorkspace } from '../../types/workspace';
import { TaskItem } from '../../types/checklist';
import { StarterPlanModal } from '../starterplan/StarterPlanModal';
import { deriveWorkspaceViewModel, getDaysUntilWedding } from '../../domain/workspaceSelectors';
import { generateInitialTasks } from '../../utils/checklistUtils';
import * as workspaceRepository from '../../repositories/workspaceRepository';
import { useAuth } from '../../auth/AuthContext';
import { AlertCircle } from 'lucide-react';

export interface OnboardingFlowProps {
  onNavigateHome: () => void;
  onNavigateDashboard: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  onNavigateHome,
  onNavigateDashboard,
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<number>(1);
  const [data, setData] = useState<OnboardingData>(() => workspaceRepository.getOnboardingDraft());
  const [generatedViewModel, setGeneratedViewModel] = useState<WorkspaceViewModel | null>(null);
  const [storedWorkspace, setStoredWorkspace] = useState<StoredWorkspace | null>(null);
  const [activeTasks, setActiveTasks] = useState<TaskItem[]>([]);
  const [isStarterPlanOpen, setIsStarterPlanOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Persist onboarding draft while steps 1–5 are active
  useEffect(() => {
    if (step <= 5) {
      workspaceRepository.saveOnboardingDraft(data);
    }
  }, [data, step]);

  // Step 1 → 2
  const handleCoupleNext = (coupleName: string) => {
    setData((prev) => ({ ...prev, coupleName }));
    setStep(2);
  };

  // Step 2 → 3
  const handleDateNext = (weddingDate: string, daysUntilWedding: number) => {
    setData((prev) => ({ ...prev, weddingDate, daysUntilWedding }));
    setStep(3);
  };

  // Step 3 → 4
  const handleOverviewNext = (budget: number, guestCount: number) => {
    setData((prev) => ({ ...prev, budget, guestCount }));
    setStep(4);
  };

  // Step 4 → 5
  const handlePrepNext = (completedCategories: CategoryId[]) => {
    setData((prev) => ({ ...prev, completedCategories }));
    setStep(5);
  };

  // Step 5 → 6: Create StoredWorkspace in Supabase, persist tasks, derive ViewModel
  const handlePriorityNext = async (primaryPlanningPriority: PlanningPriority) => {
    if (isSaving) return;
    setSaveError(null);

    const finalData: OnboardingData = { ...data, primaryPlanningPriority };
    setData(finalData);

    if (!user?.id) {
      setSaveError('Anda harus masuk terlebih dahulu untuk membuat workspace.');
      return;
    }

    setIsSaving(true);

    try {
      // 1. Get or Create Workspace in Supabase
      let stored = await workspaceRepository.getWorkspace(user.id);
      if (!stored) {
        stored = await workspaceRepository.createWorkspace(
          {
            coupleName: finalData.coupleName,
            weddingDate: finalData.weddingDate,
            estimatedBudget: finalData.budget,
            estimatedGuestCount: finalData.guestCount,
            completedCategories: (finalData.completedCategories as CategoryId[]) || [],
            primaryPlanningPriority: finalData.primaryPlanningPriority as PlanningPriority,
            religiousContexts: [],
            culturalContext: {
              hasTradition: null,
              description: null,
            },
          },
          user.id
        );
      } else {
        stored = await workspaceRepository.saveWorkspace({
          ...stored,
          coupleName: finalData.coupleName,
          weddingDate: finalData.weddingDate,
          estimatedBudget: finalData.budget,
          estimatedGuestCount: finalData.guestCount,
          completedCategories: (finalData.completedCategories as CategoryId[]) || [],
          primaryPlanningPriority: finalData.primaryPlanningPriority as PlanningPriority,
        });
      }

      // 2. Prevent duplicate initial tasks: check if tasks already exist
      const existingTasks = await workspaceRepository.getTasks(stored.id);
      let activeTasks = existingTasks;

      if (existingTasks.length === 0) {
        const initialTasks = generateInitialTasks({
          workspaceId: stored.id,
          completedCategories: stored.completedCategories,
          weddingDate: stored.weddingDate,
          daysUntilWedding: getDaysUntilWedding(stored.weddingDate),
        });
        activeTasks = await workspaceRepository.bulkCreateTasks(stored.id, initialTasks);
      }

      // 3. Clear onboarding draft now that workspace & tasks are safely persisted
      workspaceRepository.clearOnboardingDraft();

      // 4. Derive ViewModel for the WorkspaceReady screen and advance
      setStoredWorkspace(stored);
      setActiveTasks(activeTasks);
      setGeneratedViewModel(deriveWorkspaceViewModel(stored, activeTasks));
      setStep(6);
    } catch (err: unknown) {
      console.error('[WedFlow] Failed to save workspace during onboarding:', err);
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as any).message)
          : 'Terjadi kesalahan saat menyimpan data persiapan.';
      setSaveError(msg || 'Gagal menyimpan rencana ke database. Silakan periksa koneksi Anda dan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  // Step 6 → Starter Plan tasks creation handler
  const handleTasksCreatedFromStarterPlan = async (newTasks: TaskItem[]) => {
    if (!storedWorkspace) return;
    const created = await workspaceRepository.bulkCreateTasks(storedWorkspace.id, newTasks);
    const updatedTasks = [...activeTasks, ...created];
    setActiveTasks(updatedTasks);
    setGeneratedViewModel(deriveWorkspaceViewModel(storedWorkspace, updatedTasks));
  };

  // Step 6 → navigate to dashboard
  const handleWorkspaceComplete = () => {
    onNavigateDashboard();
  };

  return (
    <OnboardingLayout
      currentStep={step}
      totalSteps={5}
      onNavigateHome={onNavigateHome}
    >
      {saveError && (
        <div
          role="alert"
          className="mb-5 p-4 bg-burgundy-50 border border-burgundy-200 rounded-2xl flex items-start gap-3 text-xs sm:text-sm text-burgundy-700 animate-fadeIn shadow-2xs"
        >
          <AlertCircle className="w-4 h-4 text-burgundy-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">Gagal Menyimpan Workspace</span>
            <span>{saveError}</span>
          </div>
        </div>
      )}

      {step === 1 && (
        <CoupleStep
          value={data.coupleName}
          onNext={handleCoupleNext}
        />
      )}

      {step === 2 && (
        <WeddingDateStep
          value={data.weddingDate}
          onNext={handleDateNext}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <WeddingOverviewStep
          initialBudget={data.budget}
          initialGuestCount={data.guestCount}
          onNext={handleOverviewNext}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && (
        <PreparationStep
          initialCompleted={data.completedCategories}
          onNext={handlePrepNext}
          onBack={() => setStep(3)}
        />
      )}

      {step === 5 && (
        <PriorityStep
          initialPriority={data.primaryPlanningPriority}
          onNext={handlePriorityNext}
          onBack={() => setStep(4)}
        />
      )}

      {step === 6 && generatedViewModel && (
        <>
          <WorkspaceReadyStep
            workspace={generatedViewModel}
            onComplete={handleWorkspaceComplete}
            onOpenStarterPlan={storedWorkspace ? () => setIsStarterPlanOpen(true) : undefined}
          />
          {storedWorkspace && (
            <StarterPlanModal
              isOpen={isStarterPlanOpen}
              workspace={storedWorkspace}
              tasks={activeTasks}
              events={[]}
              onClose={() => setIsStarterPlanOpen(false)}
              onTasksCreated={handleTasksCreatedFromStarterPlan}
            />
          )}
        </>
      )}
    </OnboardingLayout>
  );
};
