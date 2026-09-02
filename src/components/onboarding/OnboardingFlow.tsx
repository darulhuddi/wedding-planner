import React, { useState, useEffect } from 'react';
import { OnboardingLayout } from './OnboardingLayout';
import { CoupleStep } from './CoupleStep';
import { WeddingDateStep } from './WeddingDateStep';
import { WeddingOverviewStep } from './WeddingOverviewStep';
import { PreparationStep } from './PreparationStep';
import { PriorityStep } from './PriorityStep';
import { WorkspaceReadyStep } from './WorkspaceReadyStep';
import { OnboardingData, PlanningPriority, CategoryId } from '../../types/onboarding';
import { WorkspaceViewModel } from '../../types/workspace';
import { createStoredWorkspace } from '../../utils/onboardingUtils';
import { deriveWorkspaceViewModel, getDaysUntilWedding } from '../../domain/workspaceSelectors';
import { generateInitialTasks } from '../../utils/checklistUtils';
import * as workspaceRepository from '../../repositories/workspaceRepository';

export interface OnboardingFlowProps {
  onNavigateHome: () => void;
  onNavigateDashboard: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  onNavigateHome,
  onNavigateDashboard,
}) => {
  const [step, setStep] = useState<number>(1);
  const [data, setData] = useState<OnboardingData>(() => workspaceRepository.getOnboardingDraft());
  const [generatedViewModel, setGeneratedViewModel] = useState<WorkspaceViewModel | null>(null);

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

  // Step 5 → 6: Create StoredWorkspace, persist, generate initial tasks
  const handlePriorityNext = (primaryPlanningPriority: PlanningPriority) => {
    const finalData: OnboardingData = { ...data, primaryPlanningPriority };
    setData(finalData);

    // Create lean StoredWorkspace (no derived values)
    const stored = createStoredWorkspace(finalData);

    // Persist workspace via repository
    workspaceRepository.saveWorkspace(stored);

    // Generate and persist initial task list
    const initialTasks = generateInitialTasks({
      workspaceId: stored.id,
      completedCategories: stored.completedCategories,
      weddingDate: stored.weddingDate,
      daysUntilWedding: getDaysUntilWedding(stored.weddingDate),
    });
    workspaceRepository.saveTasks(stored.id, initialTasks);

    // Clear draft now that workspace is created
    workspaceRepository.clearOnboardingDraft();

    // Derive ViewModel for the WorkspaceReady screen
    setGeneratedViewModel(deriveWorkspaceViewModel(stored, initialTasks));
    setStep(6);
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
        <WorkspaceReadyStep
          workspace={generatedViewModel}
          onComplete={handleWorkspaceComplete}
        />
      )}
    </OnboardingLayout>
  );
};
