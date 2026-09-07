/**
 * WedSiap Wedding Health Check - Temporary Assessment Adapter
 *
 * Converts HealthCheckInput into an authoritative, in-memory transient state:
 * - StoredWorkspace
 * - TaskItem[] (using existing generateInitialTasks)
 * - StoredBudget (using existing template allocations)
 * - WeddingEvent[]
 *
 * Zero database side-effects. 100% compatible with existing WedSiap core engines.
 */

import { HealthCheckInput, TemporaryAssessmentState } from './types';
import { StoredWorkspace } from '../../types/workspace';
import { TaskItem } from '../../types/checklist';
import { StoredBudget, BudgetAllocation, BudgetExpense } from '../../types/budget';
import { WeddingEvent } from '../events';
import { CategoryId } from '../../types/onboarding';
import { StoredAdministrationContext } from '../administration/types';
import { CATEGORY_ORDER } from '../categories';
import { getDaysUntilWedding } from '../workspaceSelectors';
import { generateInitialTasks, generateTaskId } from '../../utils/checklistUtils';
import { calculateBudgetTemplateAllocations } from '../../components/budget/BudgetStarterTemplateModal';

function getTodayYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Transforms public Health Check questionnaire input into an authoritative
 * in-memory planning state matching the exact shape expected by all WedSiap selectors.
 */
export function createTemporaryAssessmentState(
  input: HealthCheckInput,
  today: string = getTodayYMD()
): TemporaryAssessmentState {
  const workspaceId = `temp-health-check-${generateTaskId()}`;
  const nowIso = new Date().toISOString();

  // 1. Identify completed and in-progress categories from vendorStatus
  const completedCategories: CategoryId[] = [];
  const inProgressCategories: CategoryId[] = [];

  for (const cat of CATEGORY_ORDER) {
    const status = input.vendorStatus?.[cat];
    if (status === 'completed') {
      completedCategories.push(cat);
    } else if (status === 'in_progress') {
      inProgressCategories.push(cat);
    }
  }

  // 2. Build Religious Context
  const religiousContexts = input.religiousTradition
    ? [{ tradition: input.religiousTradition, label: null }]
    : [];

  // 3. Build Administration Context safely based on questionnaire
  let administrationContext: StoredAdministrationContext | undefined = undefined;
  if (input.religiousTradition === 'islam') {
    const adminStatus = input.administrationStatus?.status || 'not_started';
    const isSetup = adminStatus !== 'not_started';
    administrationContext = {
      isSetupCompleted: isSetup,
      groom: {
        birthDate: '1995-01-01', // safe default adult age > 21
        maritalStatus: 'single',
        citizenship: 'wni',
        serviceStatus: 'civilian',
        isSameKuaDistrictAsCeremony: true,
      },
      bride: {
        birthDate: '1996-01-01', // safe default adult age > 21
        maritalStatus: 'single',
        citizenship: 'wni',
        serviceStatus: 'civilian',
        isSameKuaDistrictAsCeremony: true,
      },
      hasSpecialWaliCase: false,
      updatedAt: nowIso,
    };
  }

  // 4. Construct Transient StoredWorkspace
  const workspace: StoredWorkspace = {
    id: workspaceId,
    coupleName: input.coupleName?.trim() || 'Calon Pengantin',
    weddingDate: input.weddingDate,
    estimatedBudget: Number(input.estimatedBudget) > 0 ? Number(input.estimatedBudget) : 0,
    estimatedGuestCount: Number(input.estimatedGuestCount) > 0 ? Number(input.estimatedGuestCount) : 0,
    completedCategories,
    primaryPlanningPriority: input.primaryPlanningPriority || 'checklist',
    religiousContexts,
    culturalContext: {
      hasTradition: null,
      description: null,
    },
    administrationContext,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  // 5. Generate Tasks using existing generateInitialTasks generator
  const daysUntilWedding = getDaysUntilWedding(input.weddingDate);
  const initialTasks = generateInitialTasks({
    workspaceId,
    completedCategories,
    weddingDate: input.weddingDate,
    daysUntilWedding,
  });

  // Apply in_progress state to tasks in in-progress categories
  const inProgressSet = new Set(inProgressCategories);
  const tasks: TaskItem[] = initialTasks.map((task) => {
    if (inProgressSet.has(task.category as CategoryId) && task.status === 'todo') {
      return {
        ...task,
        status: 'in_progress',
        updatedAt: nowIso,
      };
    }
    return task;
  });

  // 6. Build Transient Budget (Allocations + Expenses)
  const budgetAllocations: BudgetAllocation[] = calculateBudgetTemplateAllocations(
    workspace.estimatedBudget
  ).map((item) => ({
    id: generateTaskId(),
    category: item.category,
    amount: item.amount,
    createdAt: nowIso,
    updatedAt: nowIso,
  }));

  const budgetExpenses: BudgetExpense[] = [];
  const committedPct = Math.min(100, Math.max(0, input.budgetCommittedPercentage ?? 0));

  if (committedPct > 0 && workspace.estimatedBudget > 0) {
    const totalCommitted = Math.round((workspace.estimatedBudget * committedPct) / 100);

    // If there are completed or in-progress categories, distribute the committed funds among them
    const activeCategories = [...completedCategories, ...inProgressCategories];
    if (activeCategories.length > 0) {
      const activeAllocations = budgetAllocations.filter((a) =>
        activeCategories.includes(a.category as CategoryId)
      );
      const totalActiveAlloc = activeAllocations.reduce((sum, a) => sum + a.amount, 0);

      if (totalActiveAlloc > 0) {
        let remainingToAllocate = totalCommitted;
        activeAllocations.forEach((alloc, idx) => {
          const isLast = idx === activeAllocations.length - 1;
          const share = isLast
            ? remainingToAllocate
            : Math.round((alloc.amount / totalActiveAlloc) * totalCommitted);
          remainingToAllocate -= share;

          if (share > 0) {
            budgetExpenses.push({
              id: generateTaskId(),
              title: `Komitmen Pembayaran ${alloc.category}`,
              category: alloc.category,
              amount: share,
              date: today,
              note: 'Dicatat dari Wedding Health Check',
              createdAt: nowIso,
              updatedAt: nowIso,
            });
          }
        });
      } else {
        budgetExpenses.push({
          id: generateTaskId(),
          title: 'Komitmen Anggaran Awal',
          category: 'general',
          amount: totalCommitted,
          date: today,
          note: 'Dicatat dari Wedding Health Check',
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    } else {
      budgetExpenses.push({
        id: generateTaskId(),
        title: 'Komitmen Anggaran Awal',
        category: 'general',
        amount: totalCommitted,
        date: today,
        note: 'Dicatat dari Wedding Health Check',
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }
  }

  const budget: StoredBudget = {
    allocations: budgetAllocations,
    expenses: budgetExpenses,
  };

  // 7. Build Transient Events
  const events: WeddingEvent[] = [
    {
      id: generateTaskId(),
      workspaceId,
      type: 'ceremony',
      name: 'Akad Nikah / Pemberkatan',
      date: input.weddingDate,
      startTime: '09:00',
      endTime: '11:00',
      location: input.location || null,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  return {
    workspace,
    tasks,
    budget,
    events,
  };
}
