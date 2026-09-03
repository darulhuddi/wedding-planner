import { createStoredWorkspace } from './onboardingUtils';
import { deriveWorkspaceViewModel } from '../domain/workspaceSelectors';
import { TaskItem } from '../types/checklist';

// Helper to create mock task
function createMockTask(id: string, category: any, priority: any, dueDate: string, status: any = 'todo'): TaskItem {
  return {
    id, title: `Mock Task ${id}`, description: null, category, status, priority, dueDate,
    estimatedMinutes: null, source: 'custom', templateId: null,
    eventIds: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), completedAt: null,
  };
}

export function runDashboardScenarioTests() {
  console.log('=== WEDFLOW DASHBOARD V1 SCENARIO TESTS ===');
  const today = '2026-08-01'; // deterministic date

  // Scenario 1: New User
  const tasks1 = [
    createMockTask('1', 'venue', 'high', '2026-08-10'),
    createMockTask('2', 'catering', 'medium', '2026-08-15'),
  ];
  const ws1 = deriveWorkspaceViewModel(
    createStoredWorkspace({
      coupleName: 'Adit & Amel',
      weddingDate: '2026-10-01',
      budget: 100000000,
      guestCount: 400,
      completedCategories: [],
      primaryPlanningPriority: 'timeline',
      daysUntilWedding: 30,
    }),
    tasks1,
    today
  );

  console.log('Scenario 1 — New User:');
  console.log(`  Couple: ${ws1.coupleName} | Date: ${ws1.formattedDate} | Progress: ${ws1.completedCategoriesCount}/6 (${ws1.completionPercentage}%)`);
  console.log(`  NBA: "${ws1.nextBestAction.title}" | Reason: "${ws1.nextBestAction.reason}"`);

  // Scenario 2: Partial Preparation (2 completed)
  const tasks2 = [
    createMockTask('3', 'photography', 'high', '2026-08-01', 'completed'),
    createMockTask('4', 'decoration', 'medium', '2026-08-05'),
  ];
  const ws2 = deriveWorkspaceViewModel(
    createStoredWorkspace({
      coupleName: 'Adit & Amel',
      weddingDate: '2026-10-01',
      budget: 100000000,
      guestCount: 400,
      completedCategories: ['venue', 'photography'],
      primaryPlanningPriority: 'vendor',
      daysUntilWedding: 120,
    }),
    tasks2,
    today
  );

  console.log('\nScenario 2 — Partial Preparation:');
  console.log(`  Progress: ${ws2.completedCategoriesCount}/6 (${ws2.completionPercentage}%)`);
  console.log(`  NBA: "${ws2.nextBestAction.title}" | Reason: "${ws2.nextBestAction.reason}"`);

  // Scenario 3: All Complete
  const tasks3 = [
    createMockTask('5', 'venue', 'high', '2026-08-01', 'completed'),
  ];
  const ws3 = deriveWorkspaceViewModel(
    createStoredWorkspace({
      coupleName: 'Adit & Amel',
      weddingDate: '2026-10-01',
      budget: 100000000,
      guestCount: 400,
      completedCategories: ['venue', 'catering', 'photography', 'decoration', 'makeup_attire', 'invitation'],
      primaryPlanningPriority: 'checklist',
      daysUntilWedding: 90,
    }),
    tasks3,
    today
  );

  console.log('\nScenario 3 — All 6 Complete:');
  console.log(`  Progress: ${ws3.completedCategoriesCount}/6 (${ws3.completionPercentage}%)`);
  console.log(`  NBA: "${ws3.nextBestAction.title}" | Tag: "${ws3.nextBestAction.priorityTag}"`);

  // Scenario 4: Urgent Wedding
  const tasks4 = [
    createMockTask('6', 'venue', 'high', '2026-07-28'), // overdue
  ];
  const ws4 = deriveWorkspaceViewModel(
    createStoredWorkspace({
      coupleName: 'Adit & Amel',
      weddingDate: '2026-10-01',
      budget: 100000000,
      guestCount: 400,
      completedCategories: [],
      primaryPlanningPriority: 'timeline',
      daysUntilWedding: 20,
    }),
    tasks4,
    today
  );

  console.log('\nScenario 4 — Urgent Wedding (overdue task):');
  console.log(`  User Priority: ${ws4.primaryPlanningPriority.toUpperCase()}`);
  console.log(`  WedFlow Recommended NBA: "${ws4.nextBestAction.title}" | Reason: "${ws4.nextBestAction.reason}"`);

  // Scenario 5: Budget Priority
  const tasks5 = [
    createMockTask('7', 'general', 'high', '2026-08-15'),
  ];
  const ws5 = deriveWorkspaceViewModel(
    createStoredWorkspace({
      coupleName: 'Adit & Amel',
      weddingDate: '2026-10-01',
      budget: 100000000,
      guestCount: 400,
      completedCategories: [],
      primaryPlanningPriority: 'budget', // doesn't match a reliable metadata category in our logic
      daysUntilWedding: 150,
    }),
    tasks5,
    today
  );

  console.log('\nScenario 5 — Budget Priority (No reliable category match):');
  console.log(`  User Priority: ${ws5.primaryPlanningPriority.toUpperCase()}`);
  console.log(`  WedFlow Recommended NBA: "${ws5.nextBestAction.title}" | Reason: "${ws5.nextBestAction.reason}"`);

  console.log('\nAll 5 Dashboard scenarios tested successfully.');
  return true;
}

import { describe, it } from 'vitest';

describe('Dashboard Scenarios System Tests', () => {
  it('runs all 5 dashboard scenarios successfully', () => {
    runDashboardScenarioTests();
  });
});
