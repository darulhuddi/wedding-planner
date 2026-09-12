import { describe, it, expect } from 'vitest';
import { StoredWorkspace } from '../../types/workspace';
import { TaskItem } from '../../types/checklist';
import { deriveWorkspaceViewModel } from '../../domain/workspaceSelectors';
import { generateAdministrativeTasks } from '../../domain/administration/engine';
import { StoredAdministrationContext } from '../../domain/administration/types';

describe('Dashboard Reactivity & Next Best Action Verification (Cases A, B, C, D, E)', () => {
  const initialWorkspace: StoredWorkspace = {
    id: 'ws-reactivity-101',
    userId: 'usr-reactivity-202',
    coupleName: 'Adit & Nisa',
    weddingDate: '2027-04-10',
    estimatedBudget: 100000000,
    estimatedGuestCount: 400,
    primaryPlanningPriority: 'checklist',
    completedCategories: [],
    religiousContexts: [],
    culturalContext: { hasTradition: null, description: null },
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };

  const tasks: TaskItem[] = [];

  it('Case A — Before Setup: Un-setup workspace returns P0 Blocker ("Tentukan Konteks" or "Lengkapi Profil")', () => {
    const vm = deriveWorkspaceViewModel(initialWorkspace, tasks);
    expect(vm.nextBestAction.actionType).toBe('OPEN_ADMINISTRATION_SETUP');
    expect(['Lengkapi Profil Administrasi', 'Tentukan Konteks Agama & Pernikahan']).toContain(vm.nextBestAction.title);
  });

  it('Case B — After Setup (No Refresh): Updating workspace state with isSetupCompleted: true IMMEDIATELY updates Dashboard NBA to next task', () => {
    const adminContext: StoredAdministrationContext = {
      groom: {
        birthDate: '1996-01-01',
        maritalStatus: 'single',
        citizenship: 'wni',
        serviceStatus: 'civilian',
        isSameKuaDistrictAsCeremony: true,
      },
      bride: {
        birthDate: '1998-02-02',
        maritalStatus: 'single',
        citizenship: 'wni',
        serviceStatus: 'civilian',
        isSameKuaDistrictAsCeremony: true,
      },
      hasSpecialWaliCase: false,
      isSetupCompleted: true,
      updatedAt: new Date().toISOString(),
    };

    const updatedWorkspace: StoredWorkspace = {
      ...initialWorkspace,
      religiousContexts: [{ tradition: 'islam', label: 'Islam' }],
      administrationContext: adminContext,
      updatedAt: new Date().toISOString(),
    };

    // Generate tasks as done by handleSaveContext
    const generatedTasks = generateAdministrativeTasks(adminContext, '2027-04-10', null, [], 'islam');

    // Derive ViewModel with updated workspace state in memory (without requiring refresh)
    const vmAfterSave = deriveWorkspaceViewModel(updatedWorkspace, generatedTasks);

    // Dashboard NBA must NOT be "Lengkapi Profil" or "Tentukan Konteks"
    expect(vmAfterSave.nextBestAction.actionType).not.toBe('OPEN_ADMINISTRATION_SETUP');
    expect(vmAfterSave.nextBestAction.title).not.toBe('Lengkapi Profil Administrasi');
    expect(vmAfterSave.nextBestAction.title).not.toBe('Tentukan Konteks Agama & Pernikahan');

    // Dashboard NBA correctly suggests the first actionable KUA task (e.g. Daftar KUA / N1)
    expect(vmAfterSave.nextBestAction.target).toBe('administration');
    expect(vmAfterSave.nextBestAction.title).toBe('Daftarkan Kehendak Nikah di KUA / SIMKAH Online');
  });

  it('Case C — After Refresh: Re-derived ViewModel from persisted workspace & tasks keeps updated NBA', () => {
    const adminContext: StoredAdministrationContext = {
      groom: {
        birthDate: '1996-01-01',
        maritalStatus: 'single',
        citizenship: 'wni',
        serviceStatus: 'civilian',
        isSameKuaDistrictAsCeremony: true,
      },
      bride: {
        birthDate: '1998-02-02',
        maritalStatus: 'single',
        citizenship: 'wni',
        serviceStatus: 'civilian',
        isSameKuaDistrictAsCeremony: true,
      },
      hasSpecialWaliCase: false,
      isSetupCompleted: true,
      updatedAt: '2026-09-12T10:00:00.000Z',
    };

    const refreshedWorkspaceFromDb: StoredWorkspace = {
      ...initialWorkspace,
      religiousContexts: [{ tradition: 'islam', label: 'Islam' }],
      administrationContext: adminContext,
      updatedAt: '2026-09-12T10:00:00.000Z',
    };

    const refreshedTasksFromDb = generateAdministrativeTasks(adminContext, '2027-04-10', null, [], 'islam');

    const vmAfterRefresh = deriveWorkspaceViewModel(refreshedWorkspaceFromDb, refreshedTasksFromDb);

    expect(vmAfterRefresh.nextBestAction.actionType).not.toBe('OPEN_ADMINISTRATION_SETUP');
    expect(vmAfterRefresh.nextBestAction.title).toBe('Daftarkan Kehendak Nikah di KUA / SIMKAH Online');
  });

  it('Case D — Logout / Login: ViewModel for re-authenticated user preserves completed setup status', () => {
    const adminContext: StoredAdministrationContext = {
      groom: { birthDate: '1995-05-05', maritalStatus: 'single', citizenship: 'wni', serviceStatus: 'civilian', isSameKuaDistrictAsCeremony: true },
      bride: { birthDate: '1997-07-07', maritalStatus: 'single', citizenship: 'wni', serviceStatus: 'civilian', isSameKuaDistrictAsCeremony: true },
      hasSpecialWaliCase: false,
      isSetupCompleted: true,
      updatedAt: '2026-09-12T10:00:00.000Z',
    };

    const reauthenticatedWorkspace: StoredWorkspace = {
      ...initialWorkspace,
      religiousContexts: [{ tradition: 'islam', label: 'Islam' }],
      administrationContext: adminContext,
    };
    const userTasks = generateAdministrativeTasks(adminContext, '2027-04-10', null, [], 'islam');

    const vmLogin = deriveWorkspaceViewModel(reauthenticatedWorkspace, userTasks);
    expect(vmLogin.nextBestAction.actionType).not.toBe('OPEN_ADMINISTRATION_SETUP');
    expect(vmLogin.nextBestAction.title).toBe('Daftarkan Kehendak Nikah di KUA / SIMKAH Online');
  });

  it('Case E — New User: A distinct new workspace without setup still prompts to complete profile', () => {
    const newUserWorkspace: StoredWorkspace = {
      id: 'ws-new-user-999',
      userId: 'usr-new-user-999',
      coupleName: 'Rian & Maya',
      weddingDate: '2027-11-20',
      estimatedBudget: 150000000,
      estimatedGuestCount: 500,
      primaryPlanningPriority: 'checklist',
      completedCategories: [],
      religiousContexts: [],
      culturalContext: { hasTradition: null, description: null },
      createdAt: '2026-09-12T10:00:00.000Z',
      updatedAt: '2026-09-12T10:00:00.000Z',
    };

    const vmNewUser = deriveWorkspaceViewModel(newUserWorkspace, []);
    expect(vmNewUser.nextBestAction.actionType).toBe('OPEN_ADMINISTRATION_SETUP');
    expect(['Lengkapi Profil Administrasi', 'Tentukan Konteks Agama & Pernikahan']).toContain(vmNewUser.nextBestAction.title);
  });
});
