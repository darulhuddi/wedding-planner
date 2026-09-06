import { describe, it, expect } from 'vitest';
import {
  generateAdministrativeTasks,
  calculateBusinessDaysBefore,
  calculateDaysBefore,
  reconcileAdministrativeTasksOnReligionChange,
} from './engine';
import { StoredAdministrationContext } from './types';
import { TaskItem } from '../../types/checklist';
import { getOverdueTasks, groupTasksByTime } from '../../utils/checklistUtils';
import { getNextBestAction } from '../../utils/nextBestActionEngine';
import { StoredWorkspace } from '../../types/workspace';

const mockBaseAdminContext: StoredAdministrationContext = {
  groom: {
    birthDate: '1995-05-15',
    maritalStatus: 'single',
    citizenship: 'wni',
    serviceStatus: 'civilian',
    isSameKuaDistrictAsCeremony: true,
  },
  bride: {
    birthDate: '1997-08-20',
    maritalStatus: 'single',
    citizenship: 'wni',
    serviceStatus: 'civilian',
    isSameKuaDistrictAsCeremony: true,
  },
  hasSpecialWaliCase: false,
  isSetupCompleted: true,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const createMockWorkspace = (weddingDate: string, religion: string = 'islam'): StoredWorkspace => ({
  id: 'ws-deadline-test',
  userId: 'usr-1',
  coupleName: 'Ali & Fatimah',
  weddingDate,
  estimatedBudget: 100000000,
  estimatedGuestCount: 300,
  completedCategories: [],
  primaryPlanningPriority: 'budget',
  religiousContexts: [{ tradition: religion as any, label: religion }],
  culturalContext: { hasTradition: false, description: null },
  administrationContext: mockBaseAdminContext,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
});

describe('Administrative Deadline & Global Urgency Integration Suite', () => {
  it('1. Islam + wedding date future + guide generated -> adm-daftar-kua has dueDate = H-10 working days', () => {
    // Saturday 2026-10-24 -> H-10 working days is Monday 2026-10-12
    const weddingDate = '2026-10-24';
    const tasks = generateAdministrativeTasks(
      mockBaseAdminContext,
      weddingDate,
      undefined,
      [],
      'islam'
    );

    const kuaTask = tasks.find((t) => t.templateId === 'adm-daftar-kua');
    expect(kuaTask).toBeDefined();
    expect(kuaTask?.dueDate).toBe('2026-10-12');
  });

  it('2. Today before dueDate -> task enters global urgency according to deadline bucket', () => {
    const weddingDate = '2026-10-24';
    const tasks = generateAdministrativeTasks(
      mockBaseAdminContext,
      weddingDate,
      undefined,
      [],
      'islam'
    );

    const kuaTask = tasks.find((t) => t.templateId === 'adm-daftar-kua')!;
    expect(kuaTask.dueDate).toBe('2026-10-12');

    const groups = groupTasksByTime([kuaTask]);
    expect(groups.some((g) => g.key === 'overdue')).toBe(false);
  });

  it('3. Today = dueDate -> considered due today in global engine', () => {
    const kuaTask: TaskItem = {
      id: 't-kua-due-today',
      title: 'Pendaftaran Nikah di SIMKAH / KUA',
      description: 'Lakukan pendaftaran online melalui SIMKAH.',
      category: 'prosesi_administrasi',
      templateId: 'adm-daftar-kua',
      status: 'todo',
      priority: 'high',
      source: 'template',
      dueDate: '2026-10-12',
      estimatedMinutes: 60,
      eventIds: [],
      createdAt: '2026-08-01',
      updatedAt: '2026-08-01',
      completedAt: null,
    };

    const ws = createMockWorkspace('2026-10-24', 'islam');
    const nba = getNextBestAction(ws, [kuaTask], '2026-10-12', []);

    expect(nba.source).toBe('due_today');
    expect(nba.actionType).toBe('OPEN_ADMIN_TASK');
    expect(nba.taskId).toBe('t-kua-due-today');
  });

  it('4. Today after dueDate -> considered overdue in global engine', () => {
    const pastDueDate = '2020-01-01';
    const kuaTask: TaskItem = {
      id: 't-kua-overdue',
      title: 'Pendaftaran Nikah di SIMKAH / KUA',
      description: 'Lakukan pendaftaran online melalui SIMKAH.',
      category: 'prosesi_administrasi',
      templateId: 'adm-daftar-kua',
      status: 'todo',
      priority: 'high',
      source: 'template',
      dueDate: pastDueDate,
      estimatedMinutes: 60,
      eventIds: [],
      createdAt: '2020-01-01',
      updatedAt: '2020-01-01',
      completedAt: null,
    };

    const overdueList = getOverdueTasks([kuaTask]);
    expect(overdueList).toHaveLength(1);

    const ws = createMockWorkspace('2026-10-24', 'islam');
    const nba = getNextBestAction(ws, [kuaTask], '2026-10-15', []); // after pastDueDate

    expect(nba.priorityLevel).toBe('P1');
    expect(nba.source).toBe('overdue');
    expect(nba.actionType).toBe('OPEN_ADMIN_TASK');
    expect(nba.taskId).toBe('t-kua-overdue');
  });

  it('5. Dashboard getNextBestAction() selects adm-daftar-kua when it is the highest priority candidate', () => {
    const ws = createMockWorkspace('2026-10-24', 'islam');
    const tasks = generateAdministrativeTasks(
      mockBaseAdminContext,
      '2026-10-24',
      undefined,
      [],
      'islam'
    );

    // When today is 2 days before dueDate (2026-10-10, deadline 2026-10-12)
    const nba = getNextBestAction(ws, tasks, '2026-10-10', []);

    // adm-daftar-kua has high priority (+20) and due in 2 days (+45) = top candidate
    expect(nba.actionType).toBe('OPEN_ADMIN_TASK');
    const selected = tasks.find((t) => t.id === nba.taskId);
    expect(selected?.templateId).toBe('adm-daftar-kua');
  });

  it('6. Non-Islam profile never generates adm-daftar-kua or any KUA urgency', () => {
    const nonIslamReligions = ['christian', 'catholic', 'hindu', 'buddhist', 'confucian', 'belief', 'mixed'];

    nonIslamReligions.forEach((religion) => {
      const ws = createMockWorkspace('2026-10-24', religion);
      const tasks = generateAdministrativeTasks(
        mockBaseAdminContext,
        '2026-10-24',
        undefined,
        [],
        religion as any
      );

      const kuaTask = tasks.find((t) => t.templateId === 'adm-daftar-kua');
      expect(kuaTask, `adm-daftar-kua must not exist for ${religion}`).toBeUndefined();

      // All civil tasks must have null dueDate
      tasks.forEach((t) => {
        expect(t.dueDate).toBeNull();
      });

      // NBA should not recommend KUA tasks or KUA guide
      const nba = getNextBestAction(ws, tasks, '2026-10-15', []);
      expect(nba.actionType).not.toBe('GENERATE_ADMIN_GUIDE');
      expect(nba.title).not.toContain('KUA');
      expect(nba.title).not.toContain('SIMKAH');

      const selectedTask = tasks.find((t) => t.id === nba.taskId);
      expect(selectedTask?.templateId).not.toBe('adm-daftar-kua');
    });
  });

  it('7. H-35 planning target never enters TaskItem.dueDate, is never considered overdue, and does not override legal deadline', () => {
    const weddingDate = '2026-10-24';
    const planningTarget = calculateDaysBefore(weddingDate, 35);
    expect(planningTarget).toBe('2026-09-19');

    const tasks = generateAdministrativeTasks(
      mockBaseAdminContext,
      weddingDate,
      undefined,
      [],
      'islam'
    );

    // Ensure no task has dueDate = planningTarget
    tasks.forEach((task) => {
      if (task.templateId === 'adm-daftar-kua') {
        expect(task.dueDate).toBe('2026-10-12'); // H-10 working days, not H-35
      } else {
        expect(task.dueDate).toBeNull();
      }
    });

    // When today is after planning target (e.g. 2026-09-25) but before legal deadline (2026-10-12):
    // No task should be overdue!
    const overdueTasks = getOverdueTasks(tasks);
    expect(overdueTasks).toHaveLength(0);
  });

  it('8. Wedding date change synchronizes H-10 KUA deadline and updates urgency/NBA', () => {
    const initialWeddingDate = '2026-10-24';
    const initialTasks = generateAdministrativeTasks(
      mockBaseAdminContext,
      initialWeddingDate,
      undefined,
      [],
      'islam'
    );

    const initialKua = initialTasks.find((t) => t.templateId === 'adm-daftar-kua');
    expect(initialKua?.dueDate).toBe('2026-10-12');

    // Wedding date rescheduled to Wednesday 2026-11-25
    const newWeddingDate = '2026-11-25';
    const updatedTasks = generateAdministrativeTasks(
      mockBaseAdminContext,
      newWeddingDate,
      undefined,
      initialTasks,
      'islam'
    );

    const updatedKua = updatedTasks.find((t) => t.templateId === 'adm-daftar-kua');
    expect(updatedKua?.dueDate).toBe(calculateBusinessDaysBefore(newWeddingDate, 10));
    expect(updatedKua?.dueDate).toBe('2026-11-11');

    // On 2026-10-15 (which would have been overdue for the old wedding date),
    // it is now comfortably in the future for the new wedding date
    const ws = createMockWorkspace(newWeddingDate, 'islam');
    const nba = getNextBestAction(ws, updatedTasks, '2026-10-15', []);
    expect(nba.source).not.toBe('overdue');
  });

  it('9. Religion Islam -> Christian -> Islam does not cause duplicate or obsolete KUA tasks to become NBA candidates', () => {
    // 1. Initial Islam state
    const weddingDate = '2026-10-24';
    const islamTasks = generateAdministrativeTasks(
      mockBaseAdminContext,
      weddingDate,
      undefined,
      [],
      'islam'
    );
    expect(islamTasks.filter((t) => t.templateId === 'adm-daftar-kua')).toHaveLength(1);

    // 2. Transition to Christian
    const christianTasks = reconcileAdministrativeTasksOnReligionChange(islamTasks, 'christian');
    expect(christianTasks.find((t) => t.templateId === 'adm-daftar-kua')).toBeUndefined();

    const christianWs = createMockWorkspace(weddingDate, 'christian');
    const christianNba = getNextBestAction(christianWs, christianTasks, '2026-10-15', []);
    expect(christianNba.title).not.toContain('KUA');

    // 3. Transition back to Islam
    const backToIslamTasks = reconcileAdministrativeTasksOnReligionChange(christianTasks, 'islam');
    const regeneratedIslamTasks = generateAdministrativeTasks(
      mockBaseAdminContext,
      weddingDate,
      undefined,
      backToIslamTasks,
      'islam'
    );

    // Exactly one adm-daftar-kua task with correct deadline
    const kuaList = regeneratedIslamTasks.filter((t) => t.templateId === 'adm-daftar-kua');
    expect(kuaList).toHaveLength(1);
    expect(kuaList[0].dueDate).toBe('2026-10-12');
  });
});
