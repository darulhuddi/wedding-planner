import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../lib/supabaseClient';
import {
  mapRowToStoredWorkspace,
  mapWorkspaceToRow,
  fetchWorkspaceByUserId,
  insertWorkspace,
  updateWorkspace,
  normalizeAdministrationContext,
  SupabaseWorkspaceRow,
} from './supabaseWorkspaceAdapter';
import { StoredWorkspace } from '../types/workspace';
import { StoredAdministrationContext } from '../domain/administration/types';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Administration Profile Persistence Integration Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const userId = 'usr-test-uuid-999';
  const workspaceId = 'ws-test-uuid-888';

  const mockAdminContext: StoredAdministrationContext = {
    groom: {
      birthDate: '1995-04-12',
      maritalStatus: 'single',
      citizenship: 'wni',
      serviceStatus: 'civilian',
      isSameKuaDistrictAsCeremony: true,
    },
    bride: {
      birthDate: '1997-09-25',
      maritalStatus: 'single',
      citizenship: 'wni',
      serviceStatus: 'civilian',
      isSameKuaDistrictAsCeremony: false,
    },
    hasSpecialWaliCase: false,
    isSetupCompleted: true,
    updatedAt: '2026-09-07T12:00:00.000Z',
  };

  const initialWorkspace: StoredWorkspace = {
    id: workspaceId,
    userId,
    coupleName: 'Budi & Ani',
    weddingDate: '2027-06-20',
    estimatedBudget: 120000000,
    estimatedGuestCount: 300,
    primaryPlanningPriority: 'checklist',
    completedCategories: [],
    religiousContexts: [{ tradition: 'islam', label: 'Islam' }],
    culturalContext: { hasTradition: false, description: null },
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };

  it('1. New User Flow: workspace without administration_context has administrationContext === undefined and isSetupCompleted === false', () => {
    const rawRow: SupabaseWorkspaceRow = {
      id: workspaceId,
      user_id: userId,
      couple_name: 'Budi & Ani',
      wedding_date: '2027-06-20',
      estimated_budget: 120000000,
      estimated_guest_count: 300,
      primary_planning_priority: 'checklist',
      completed_categories: [],
      religious_contexts: [{ tradition: 'islam', label: 'Islam' }],
      cultural_context: { hasTradition: false, description: null },
      administration_context: null,
      created_at: '2026-09-01T00:00:00.000Z',
      updated_at: '2026-09-01T00:00:00.000Z',
    };

    const ws = mapRowToStoredWorkspace(rawRow);
    expect(ws.administrationContext).toBeUndefined();
    expect(Boolean(ws.administrationContext?.isSetupCompleted)).toBe(false);
  });

  it('2. Save Flow: saving administrationContext serializes administration_context to Supabase payload', async () => {
    const updatedWorkspace: StoredWorkspace = {
      ...initialWorkspace,
      administrationContext: mockAdminContext,
    };

    const rowPayload = mapWorkspaceToRow(updatedWorkspace, userId);
    expect(rowPayload.administration_context).toEqual(mockAdminContext);

    const savedRow: SupabaseWorkspaceRow = {
      ...mapWorkspaceToRow(updatedWorkspace, userId) as SupabaseWorkspaceRow,
      id: workspaceId,
      created_at: initialWorkspace.createdAt,
      updated_at: new Date().toISOString(),
    };

    const singleMock = vi.fn().mockResolvedValueOnce({ data: savedRow, error: null });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const eqMock = vi.fn().mockReturnValue({ select: selectMock });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as any);

    const result = await updateWorkspace(updatedWorkspace);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        administration_context: mockAdminContext,
      })
    );
    expect(result.administrationContext).toEqual(mockAdminContext);
    expect(result.administrationContext?.isSetupCompleted).toBe(true);
  });

  it('3. Refresh / Fetch Flow: fetchWorkspaceByUserId restores administrationContext from DB row', async () => {
    const dbRowWithAdmin: SupabaseWorkspaceRow = {
      id: workspaceId,
      user_id: userId,
      couple_name: 'Budi & Ani',
      wedding_date: '2027-06-20',
      estimated_budget: 120000000,
      estimated_guest_count: 300,
      primary_planning_priority: 'checklist',
      completed_categories: [],
      religious_contexts: [{ tradition: 'islam', label: 'Islam' }],
      cultural_context: { hasTradition: false, description: null },
      administration_context: mockAdminContext,
      created_at: '2026-09-01T00:00:00.000Z',
      updated_at: '2026-09-07T12:00:00.000Z',
    };

    const maybeSingleMock = vi.fn().mockResolvedValueOnce({ data: dbRowWithAdmin, error: null });
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

    const fetchedWorkspace = await fetchWorkspaceByUserId(userId);

    expect(fetchedWorkspace).not.toBeNull();
    expect(fetchedWorkspace?.administrationContext).toBeDefined();
    expect(fetchedWorkspace?.administrationContext?.isSetupCompleted).toBe(true);
    expect(fetchedWorkspace?.administrationContext?.groom.birthDate).toBe('1995-04-12');
    expect(fetchedWorkspace?.administrationContext?.bride.isSameKuaDistrictAsCeremony).toBe(false);
  });

  it('4. Edit Profile Flow: modifying fields updates administration_context and remains persistent on re-fetch', async () => {
    const editedAdminContext: StoredAdministrationContext = {
      ...mockAdminContext,
      groom: {
        ...mockAdminContext.groom,
        serviceStatus: 'tni_polri',
      },
      hasSpecialWaliCase: true,
      updatedAt: '2026-09-07T15:00:00.000Z',
    };

    const editedWorkspace: StoredWorkspace = {
      ...initialWorkspace,
      administrationContext: editedAdminContext,
    };

    const editedRow: SupabaseWorkspaceRow = {
      ...mapWorkspaceToRow(editedWorkspace, userId) as SupabaseWorkspaceRow,
      id: workspaceId,
      created_at: initialWorkspace.createdAt,
      updated_at: '2026-09-07T15:00:00.000Z',
    };

    const singleMock = vi.fn().mockResolvedValueOnce({ data: editedRow, error: null });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const eqMock = vi.fn().mockReturnValue({ select: selectMock });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as any);

    const result = await updateWorkspace(editedWorkspace);
    expect(result.administrationContext?.groom.serviceStatus).toBe('tni_polri');
    expect(result.administrationContext?.hasSpecialWaliCase).toBe(true);
  });

  it('5. Normalization Robustness: malformed or null DB json is sanitized without crashing', () => {
    expect(normalizeAdministrationContext(null)).toBeUndefined();
    expect(normalizeAdministrationContext(undefined)).toBeUndefined();
    expect(normalizeAdministrationContext({})).toBeUndefined();
    expect(normalizeAdministrationContext({ groom: {} })).toBeUndefined();

    const partialObj = {
      groom: { birthDate: '1990-01-01' },
      bride: { birthDate: '1992-02-02' },
      isSetupCompleted: true,
    };

    const normalized = normalizeAdministrationContext(partialObj);
    expect(normalized).toBeDefined();
    expect(normalized?.groom.birthDate).toBe('1990-01-01');
    expect(normalized?.groom.maritalStatus).toBe('single');
    expect(normalized?.groom.citizenship).toBe('wni');
    expect(normalized?.groom.serviceStatus).toBe('civilian');
    expect(normalized?.isSetupCompleted).toBe(true);
  });
});
