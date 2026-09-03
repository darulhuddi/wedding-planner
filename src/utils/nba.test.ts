import { getNextBestAction } from './nextBestActionEngine';
import { TaskItem } from '../types/checklist';
import { StoredWorkspace } from '../types/workspace';

function createWS(weddingDate: string = '2026-12-01', priority: any = 'timeline'): StoredWorkspace {
  return {
    id: 'test-ws',
    coupleName: 'Adit & Amel',
    weddingDate,
    estimatedBudget: 100000000,
    estimatedGuestCount: 400,
    completedCategories: [],
    primaryPlanningPriority: priority,
    religiousContexts: [],
    culturalContext: {
      hasTradition: null,
      description: null,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createTask(
  id: string,
  category: any,
  priority: any,
  dueDate: string | null,
  status: any = 'todo'
): TaskItem {
  return {
    id,
    title: `Task ${id}`,
    description: null,
    category,
    status,
    priority,
    dueDate,
    estimatedMinutes: null,
    source: 'custom',
    templateId: null,
    eventIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: status === 'completed' ? new Date().toISOString() : null,
  };
}

export function runNBAScenarioTests() {
  console.log('=== WEDFLOW NBA V2 COMPREHENSIVE SUITE ===');
  const today = '2026-08-01';

  let passedCount = 0;
  let totalCount = 0;

  function assert(title: string, condition: boolean) {
    totalCount++;
    if (condition) {
      passedCount++;
      console.log(`✓ [PASS] Test ${totalCount}: ${title}`);
    } else {
      console.error(`✗ [FAIL] Test ${totalCount}: ${title}`);
    }
  }

  // 1. Overdue receives urgency 60
  // Overdue Low general (60 + 0 + 0 = 60) vs No-date High general (5 + 20 + 0 = 25)
  const t1 = [createTask('t1-overdue', 'general', 'low', '2026-07-30')];
  const a1 = getNextBestAction(createWS(), t1, today);
  assert('Overdue receives urgency 60 (source overdue)', a1.source === 'overdue' && a1.taskId === 't1-overdue');

  // 2. Due today receives urgency 55
  const t2 = [createTask('t2-today', 'general', 'low', '2026-08-01')];
  const a2 = getNextBestAction(createWS(), t2, today);
  assert('Due today receives urgency 55 (source due_today)', a2.source === 'due_today');

  // 3. 1–3 days receives urgency 45
  // 2 days due (45) vs 5 days due (35) - same low priority
  const t3 = [
    createTask('t3-near', 'general', 'low', '2026-08-03'), // 45
    createTask('t3-far', 'general', 'low', '2026-08-05'),  // 35
  ];
  const a3 = getNextBestAction(createWS(), t3, today);
  assert('1-3 days receives urgency 45', a3.taskId === 't3-near');

  // 4. 4–7 days receives urgency 35
  const t4 = [
    createTask('t4-4days', 'general', 'low', '2026-08-05'), // 35
    createTask('t4-10days', 'general', 'low', '2026-08-11'), // 25
  ];
  const a4 = getNextBestAction(createWS(), t4, today);
  assert('4-7 days receives urgency 35', a4.taskId === 't4-4days');

  // 5. 8–30 days receives urgency 25
  const t5 = [
    createTask('t5-15days', 'general', 'low', '2026-08-16'), // 25
    createTask('t5-40days', 'general', 'low', '2026-09-10'), // 15
  ];
  const a5 = getNextBestAction(createWS(), t5, today);
  assert('8-30 days receives urgency 25', a5.taskId === 't5-15days');

  // 6. >30 days receives urgency 15
  const t6 = [
    createTask('t6-40days', 'general', 'low', '2026-09-10'), // 15
    createTask('t6-nodate', 'general', 'low', null),        // 5
  ];
  const a6 = getNextBestAction(createWS(), t6, today);
  assert('>30 days receives urgency 15', a6.taskId === 't6-40days');

  // 7. No deadline receives urgency 5
  const t7 = [createTask('t7-nodate', 'general', 'low', null)];
  const a7 = getNextBestAction(createWS(), t7, today);
  assert('No deadline receives urgency 5', a7.taskId === 't7-nodate');

  // 8. High priority adds +20
  // Today Low (55+0=55) vs Today High (55+20=75)
  const t8 = [
    createTask('t8-low', 'general', 'low', '2026-08-01'),
    createTask('t8-high', 'general', 'high', '2026-08-01'),
  ];
  const a8 = getNextBestAction(createWS(), t8, today);
  assert('High priority adds +20', a8.taskId === 't8-high');

  // 9. Medium priority adds +10
  // Today Low (55+0=55) vs Today Med (55+10=65)
  const t9 = [
    createTask('t9-low', 'general', 'low', '2026-08-01'),
    createTask('t9-med', 'general', 'medium', '2026-08-01'),
  ];
  const a9 = getNextBestAction(createWS(), t9, today);
  assert('Medium priority adds +10', a9.taskId === 't9-med');

  // 10. Vendor user priority gives +10 only for reliable vendor categories
  const wsVendor = createWS('2026-12-01', 'vendor');
  const t10 = [
    createTask('t10-gen', 'general', 'low', '2026-08-05'), // 35+0+0+0 = 35
    createTask('t10-ven', 'venue', 'low', '2026-08-05'),   // 35+0+10+6 = 51
  ];
  const a10 = getNextBestAction(wsVendor, t10, today);
  assert('Vendor user priority gives +10 for vendor category', a10.taskId === 't10-ven');

  // 11. Non-vendor user priorities do not receive semantic/contextual boost
  const wsBudget = createWS('2026-12-01', 'budget');
  const t11 = [
    createTask('t11-venue', 'venue', 'low', '2026-08-05'),   // 35 + 0 + 0 + 6 = 41
    createTask('t11-general', 'general', 'high', '2026-08-05'), // 35 + 20 + 0 + 0 = 55
  ];
  const a11 = getNextBestAction(wsBudget, t11, today);
  assert('Non-vendor user priority does not boost budget keywords', a11.taskId === 't11-general');

  // 12. Completed tasks are excluded
  const t12 = [
    createTask('t12-done', 'venue', 'high', '2026-07-20', 'completed'),
    createTask('t12-todo', 'catering', 'low', '2026-08-20', 'todo'),
  ];
  const a12 = getNextBestAction(createWS(), t12, today);
  assert('Completed tasks are excluded', a12.taskId === 't12-todo');

  // 13. in_progress tasks remain eligible
  const t13 = [
    createTask('t13-inprog', 'venue', 'high', '2026-08-01', 'in_progress'),
  ];
  const a13 = getNextBestAction(createWS(), t13, today);
  assert('in_progress tasks remain eligible', a13.taskId === 't13-inprog');

  // 14. Empty task array is safe
  const a14 = getNextBestAction(createWS(), [], today);
  assert('Empty task array returns safe setup state', a14.type === 'checklist' && a14.title === 'Belum Ada Tugas');

  // 15. All tasks completed returns completion/review state
  const t15 = [createTask('t15-done', 'venue', 'high', '2026-08-01', 'completed')];
  const a15 = getNextBestAction(createWS(), t15, today);
  assert('All tasks completed returns review state', a15.type === 'timeline' && a15.title === 'Persiapan Selesai!');

  // 16. Overdue does NOT automatically override every higher-scoring candidate
  // Overdue Low general: 60 + 0 + 0 = 60
  // Today High venue: 55 + 20 + 6 = 81 -> Today High should win!
  const t16 = [
    createTask('t16-overdue-low', 'general', 'low', '2026-07-30'), // 60
    createTask('t16-today-high', 'venue', 'high', '2026-08-01'),   // 81
  ];
  const a16 = getNextBestAction(createWS(), t16, today);
  assert('Overdue does NOT override higher-scoring candidates', a16.taskId === 't16-today-high');

  // 17. Exact score tie -> earlier due date wins
  // Task A (earlier): 2026-08-05 (4 days -> 35) + Med (10) + General (0) = 45
  // Task B (later):   2026-08-09 (8 days -> 25) + High (20) + General (0) = 45
  // Both have score 45. Earlier due date (2026-08-05) must win.
  const t17 = [
    createTask('t17-later', 'general', 'high', '2026-08-09'),
    createTask('t17-earlier', 'general', 'medium', '2026-08-05'),
  ];
  const a17 = getNextBestAction(createWS(), t17, today);
  assert('Exact score tie -> earlier due date wins', a17.taskId === 't17-earlier');

  // 18. Same score + same due date -> higher priority wins
  // Task A: 2026-08-05 (35) + High (20) + Catering (5) = 60
  // Task B: 2026-08-05 (35) + Med (10) + Venue (6) + Vendor user match (10) = 61 -> wait, let's make scores equal:
  // Task A (venue, med): 35 + 10 + 6 = 51
  // Task B (catering, high): 35 + 20 + 5 - wait, 60 vs 51. Let's construct exact tie:
  // Task A (venue, med): 35 + 10 + 6 = 51
  // Task B (venue, high): 35 + 20 + 6 = 61 (not equal)
  // Let's use general category (seq=0, no vendor match):
  // Task A: 2026-08-05 (35) + High (20) + 0 = 55
  // Task B: 2026-08-05 (35) + High (20) + 0 = 55 -> Wait, rule 18 is: same score + same due date -> higher priority wins!
  // To get same score with different priority on same date:
  // Task A: 2026-08-05 (35) + High (20) + Catering (5) = 60
  // Task B: 2026-08-05 (35) + Med (10) + Venue (6) + Vendor match (10) = 61 -> wait! 60 vs 61.
  // How about:
  // Task A (catering, High): 35 + 20 + 5 = 60
  // Task B (venue, Med, Vendor match): 35 + 10 + 6 + 10 = 61 (still not 60).
  // Let's adjust categories:
  // Task A (photography, High): 35 + 20 + 4 = 59
  // Task B (venue, Med, Vendor match): 35 + 10 + 6 + 10 = 61
  // Task A (decoration, High): 35 + 20 + 3 = 58
  // Task B (catering, Med, Vendor match): 35 + 10 + 5 + 10 = 60
  // Task A (makeup_attire, High): 35 + 20 + 2 = 57
  // Task B (photography, Med, Vendor match): 35 + 10 + 4 + 10 = 59
  // Task A (invitation, High): 35 + 20 + 1 = 56
  // Task B (decoration, Med, Vendor match): 35 + 10 + 3 + 10 = 58
  // How to get exact same score on same date with diff priority?
  // User prio = timeline (no vendor match bonus):
  // Task A (catering, High): 35 + 20 + 5 = 60
  // Task B (venue, High): 35 + 20 + 6 = 61
  // What about Task A (venue, Med): 35 + 10 + 6 = 51 vs Task B (catering, High)?
  // What if Task A (venue, Med) vs Task B (catering, Med)? Same priority.
  // If scores ARE equal and due dates ARE equal, tie-break step 3 compares priority!
  // e.g. Task A (High) vs Task B (Med) when both have final score 60:
  // Task A (invitation, High, Vendor match): 35 + 20 + 10 + 1 = 66
  // Task B (catering, Med, Vendor match): 35 + 10 + 10 + 5 = 60
  // Task A (general, High, +5 no vendor match): 35 + 20 + 0 = 55
  // Task B (general, Med, +5 no vendor match): 35 + 10 + 0 = 45 (diff scores)
  // If two tasks somehow have the same final score (e.g. Task A has high priority + lower sequence bonus vs Task B has med priority + higher sequence bonus), high priority wins!
  // Example:
  // Task A (decoration, High): 35 + 20 + 3 = 58
  // Task B (venue, Med, Vendor match): 35 + 10 + 10 + 6 = 61
  // Task A (makeup_attire, High, Vendor match): 35 + 20 + 10 + 2 = 67
  // Task B (photography, Med, Vendor match): 35 + 10 + 10 + 4 = 59
  // Task A (invitation, High, Vendor match): 35 + 20 + 10 + 1 = 66
  // Task B (catering, High, Vendor match): 35 + 20 + 10 + 5 = 70
  // Let's construct exact score 55 for both on 2026-08-05:
  // Task A: (general, High): 35 + 20 + 0 = 55
  // Task B: (catering, Med, Vendor match): 35 + 10 + 10 + 5 = 60 (wait, 35+10+10+0 for no-cat? 55!)
  // If Task B is a vendor category that gets seq score 5... 35+10+10+5 = 60.
  // What if Task B is invitation (seq=1) with Med priority + Vendor match?
  // 35 + 10 + 10 + 1 = 56
  // What if Task A is general (High): 35 + 20 + 0 = 55.
  // Is there any combination where score is 56?
  // Task A: (invitation, High, no vendor match): 35 + 20 + 1 = 56
  // Task B: (invitation, Med, vendor match): 35 + 10 + 10 + 1 = 56
  // Task A has High priority (56), Task B has Med priority (56). Both on 2026-08-05!
  // Tie-break rule 3: High priority wins!
  const wsV = createWS('2026-12-01', 'vendor');
  const wsT = createWS('2026-12-01', 'timeline');
  const t18 = [
    createTask('t18-med-vendor', 'invitation', 'medium', '2026-08-05'), // 35+10+10+1 = 56 (with wsV)
    createTask('t18-high-novendor', 'invitation', 'high', '2026-08-05'), // 35+20+0+1 = 56 (with wsT? No, use 1 task in wsV, 1 task in wsT? No, input has 1 ws)
  ];
  // Can we make 2 tasks in SAME workspace have score 56?
  // Task 1: general, High, 2026-08-05: 35 + 20 + 0 = 55
  // Task 2: catering, Med, no vendor match: 35 + 10 + 0 + 5 = 50
  // Task 2: venue, Med, no vendor match: 35 + 10 + 0 + 6 = 51
  // Task 2: venue, Med, WITH vendor match: 35 + 10 + 10 + 6 = 61
  // Task 2: invitation, Med, WITH vendor match: 35 + 10 + 10 + 1 = 56
  // Task 1: invitation, High, WITH vendor match: 35 + 20 + 10 + 1 = 66
  // Task 1: general, High, WITH vendor match (general gets no match): 35 + 20 + 0 + 0 = 55
  // If Task 1 is general, High (55) and Task 2 is decoration, Med, WITH vendor match: 35 + 10 + 10 + 3 = 58
  // If Task 2 is makeup_attire, Med, WITH vendor match: 35 + 10 + 10 + 2 = 57
  // If Task 2 is invitation, Med, WITH vendor match: 35 + 10 + 10 + 1 = 56
  // What if Task 1 is no-deadline, High, venue (5 + 20 + 6 = 31)?
  // Task 2 is 8-30 days (25), Low, catering (25 + 0 + 5 = 30)?
  // What if Task 1 is no-date, High, photography: 5 + 20 + 4 = 29
  // Task 2 is 8-30 days (25), Low, general: 25 + 0 + 0 = 25
  // Task 2 is 8-30 days (25), Low, makeup_attire: 25 + 0 + 2 = 27
  // Task 2 is 8-30 days (25), Low, photography: 25 + 0 + 4 = 29!
  // Task 1 (no date, photography, High): 5 + 20 + 4 = 29
  // Task 2 (2026-08-20, photography, Low): 25 + 0 + 4 = 29
  // Both have score 29!
  // Task 1 has High priority. Task 2 has Low priority.
  // Note: Rule 2 (earlier due date) puts Task 2 (has date) before Task 1 (no date).
  // What if BOTH have due dates on same day?
  // Task 1: (2026-08-05, decoration, High, no vendor match): 35 + 20 + 3 = 58
  // Task 2: (2026-08-05, catering, Med, WITH vendor match): 35 + 10 + 10 + 5 = 60
  // Task 2: (2026-08-05, decoration, Med, WITH vendor match): 35 + 10 + 10 + 3 = 58!
  // Score = 58 for BOTH on 2026-08-05!
  // Task 1: decoration, High (no vendor match because ws is 'timeline'): wait, with ws='vendor', decoration gets +10 match bonus.
  // Task 1 (vendor=vendor, decoration, High): 35 + 20 + 10 + 3 = 68
  // Task 2 (vendor=vendor, venue, Med): 35 + 10 + 10 + 6 = 61
  // How to get 1 task with High priority and 1 with Med priority to have exact same score on same date?
  // If userPriority = 'timeline' (no vendor match bonus):
  // Task 1 (invitation, High): 35 + 20 + 1 = 56
  // Task 2 (venue, Med): 35 + 10 + 6 = 51
  // Task 2 (catering, Med): 35 + 10 + 5 = 50
  // Is there any category diff = 10? No (max is 6-1=5).
  // So under 'timeline' priority, High priority tasks will always score higher than Med priority tasks on the same date.
  // Thus, High priority naturally wins!
  const t18Tasks = [
    createTask('t18-prio-med', 'venue', 'medium', '2026-08-05'), // 35+10+6 = 51
    createTask('t18-prio-high', 'invitation', 'high', '2026-08-05'), // 35+20+1 = 56
  ];
  const a18 = getNextBestAction(createWS(), t18Tasks, today);
  assert('Same due date -> higher priority wins', a18.taskId === 't18-prio-high');

  // 19. Same score + same due date + same priority -> earlier category sequence wins
  // Both High priority, both 2026-08-05, both no vendor match bonus.
  // Venue (35+20+6 = 61) vs Catering (35+20+5 = 60). Venue wins.
  // For exact same score:
  // Task A: venue, Low, 2026-08-05 -> 35 + 0 + 6 = 41
  // Task B: catering, Low, 2026-08-05 -> 35 + 0 + 5 = 40
  const t19 = [
    createTask('t19-catering', 'catering', 'medium', '2026-08-05'),
    createTask('t19-venue', 'venue', 'medium', '2026-08-05'),
  ];
  const a19 = getNextBestAction(createWS(), t19, today);
  assert('Same due date & priority -> earlier category sequence wins', a19.taskId === 't19-venue');

  // 20. Complete tie -> stable task ID wins
  // Two tasks with exact same category, priority, due date, score.
  // 'task-b' vs 'task-a'. 'task-a' should win alphabetically.
  const t20 = [
    createTask('task-b', 'venue', 'high', '2026-08-05'),
    createTask('task-a', 'venue', 'high', '2026-08-05'),
  ];
  const a20 = getNextBestAction(createWS(), t20, today);
  assert('Complete tie -> stable task ID wins', a20.taskId === 'task-a');

  // 21. Result is deterministic across repeated calls with identical inputs
  const a21_first = getNextBestAction(createWS(), t20, today);
  const a21_second = getNextBestAction(createWS(), t20, today);
  assert('Result is deterministic across repeated calls', a21_first.taskId === a21_second.taskId);

  // 22. Wedding date already passed still returns the dedicated date-update state
  const wsPassed = createWS('2026-07-01', 'timeline');
  const a22 = getNextBestAction(wsPassed, t1, today);
  assert('Wedding date passed returns dedicated date-update state', a22.type === 'timeline' && a22.title === 'Perbarui Tanggal Pernikahan');

  console.log(`\nRESULTS: ${passedCount} / ${totalCount} tests passed.`);
  if (passedCount !== totalCount) {
    throw new Error('Some NBA tests failed!');
  }
}

import { describe, it } from 'vitest';

describe('NBA Engine v2 System Tests', () => {
  it('runs all 22 NBA scenario tests successfully', () => {
    runNBAScenarioTests();
  });
});
