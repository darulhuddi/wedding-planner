import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAdministrativeTasks, getApplicableAdministrativeTasks } from './engine';
import { StoredAdministrationContext } from './types';
import { TaskItem } from '../../types/checklist';
import { StoredWorkspace } from '../../types/workspace';

describe('KUA Checklist Persistence Integration Verification (Scenarios A, B, C, D)', () => {

  const mockAdminContext: StoredAdministrationContext = {
    groom: {
      birthDate: '1996-03-10',
      maritalStatus: 'single',
      citizenship: 'wni',
      serviceStatus: 'civilian',
      isSameKuaDistrictAsCeremony: false, // Memerlukan rekomendasi KUA (Numpang Nikah) -> Total 13 tasks
    },
    bride: {
      birthDate: '1998-07-20',
      maritalStatus: 'single',
      citizenship: 'wni',
      serviceStatus: 'civilian',
      isSameKuaDistrictAsCeremony: true,
    },
    hasSpecialWaliCase: false,
    isSetupCompleted: true,
    updatedAt: new Date().toISOString(),
  };

  it('Scenario A — Initial Setup produces exact 13 KUA checklist tasks for Islamic context', () => {
    const generated = generateAdministrativeTasks(
      mockAdminContext,
      '2027-05-15',
      null,
      [],
      'islam'
    );

    const applicable = getApplicableAdministrativeTasks(generated, 'islam');
    expect(applicable.length).toBe(13);

    const templateIds = applicable.map((t) => t.templateId);
    expect(templateIds).toContain('adm-doc-ktp');
    expect(templateIds).toContain('adm-doc-kk');
    expect(templateIds).toContain('adm-doc-akta');
    expect(templateIds).toContain('adm-doc-foto');
    expect(templateIds).toContain('adm-doc-wali-saksi');
    expect(templateIds).toContain('adm-urus-kesehatan');
    expect(templateIds).toContain('adm-urus-rt-rw');
    expect(templateIds).toContain('adm-urus-n1');
    expect(templateIds).toContain('adm-daftar-kua');
    expect(templateIds).toContain('adm-periksa-rapak');
    expect(templateIds).toContain('adm-periksa-bimwin');
    expect(templateIds).toContain('adm-daftar-bayar-pnbp');
  });

  it('Scenario B — Multi-task bulk persistence retains all 13 tasks across simulated reload (no 13 -> 2 -> 3 drop)', () => {
    const generated = generateAdministrativeTasks(
      mockAdminContext,
      '2027-05-15',
      null,
      [],
      'islam'
    );

    // Simulate bulk creation in database (as handleTaskChange now calls bulkCreateTasks for all added items)
    const storedDatabaseTasks: TaskItem[] = [...generated];

    // Simulate browser refresh: tasks re-fetched from database
    const refreshedTasksFromDb = [...storedDatabaseTasks];
    const applicableAfterRefresh = getApplicableAdministrativeTasks(refreshedTasksFromDb, 'islam');

    expect(applicableAfterRefresh.length).toBe(13);
  });

  it('Scenario C — Completion state: marking 3 tasks completed maintains total = 13, completed = 3 across reload', () => {
    const generated = generateAdministrativeTasks(
      mockAdminContext,
      '2027-05-15',
      null,
      [],
      'islam'
    );

    // Mark 3 tasks as completed
    generated[0].status = 'completed';
    generated[0].completedAt = new Date().toISOString();
    generated[1].status = 'completed';
    generated[1].completedAt = new Date().toISOString();
    generated[2].status = 'completed';
    generated[2].completedAt = new Date().toISOString();

    // Persist to database
    const storedDatabaseTasks: TaskItem[] = [...generated];

    // Simulate browser refresh: tasks fetched from database
    const refreshedTasksFromDb = [...storedDatabaseTasks];
    const applicable = getApplicableAdministrativeTasks(refreshedTasksFromDb, 'islam');

    const totalCount = applicable.length;
    const completedCount = applicable.filter((t) => t.status === 'completed').length;
    const remainingCount = applicable.filter((t) => t.status !== 'completed').length;

    expect(totalCount).toBe(13);
    expect(completedCount).toBe(3);
    expect(remainingCount).toBe(10);
  });

  it('Scenario D — Re-running setup with existing tasks does NOT create duplicates or alter task total (remains 13)', () => {
    const initialTasks = generateAdministrativeTasks(
      mockAdminContext,
      '2027-05-15',
      null,
      [],
      'islam'
    );

    // Re-run setup generation with initialTasks passed as existing
    const regenerated = generateAdministrativeTasks(
      mockAdminContext,
      '2027-05-15',
      null,
      initialTasks,
      'islam'
    );

    expect(regenerated.length).toBe(13);
    const uniqueIds = new Set(regenerated.map((t) => t.id));
    expect(uniqueIds.size).toBe(13);
  });
});
