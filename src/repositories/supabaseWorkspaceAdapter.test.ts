import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../lib/supabaseClient';
import {
  mapRowToStoredWorkspace,
  mapWorkspaceToRow,
  fetchWorkspaceByUserId,
  insertWorkspace,
  updateWorkspace,
  SupabaseWorkspaceRow,
} from './supabaseWorkspaceAdapter';
import { StoredWorkspace } from '../types/workspace';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('supabaseWorkspaceAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleRow: SupabaseWorkspaceRow = {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    user_id: 'user-uuid-123',
    couple_name: 'Adit & Nisa',
    wedding_date: '2027-02-14',
    estimated_budget: 150000000,
    estimated_guest_count: 500,
    primary_planning_priority: 'timeline',
    completed_categories: ['venue', 'catering'],
    created_at: '2026-09-03T00:00:00.000Z',
    updated_at: '2026-09-03T00:00:00.000Z',
  };

  const sampleWorkspace: StoredWorkspace = {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    userId: 'user-uuid-123',
    coupleName: 'Adit & Nisa',
    weddingDate: '2027-02-14',
    estimatedBudget: 150000000,
    estimatedGuestCount: 500,
    primaryPlanningPriority: 'timeline',
    completedCategories: ['venue', 'catering'],
    religiousContexts: [],
    culturalContext: {
      hasTradition: null,
      description: null,
    },
    createdAt: '2026-09-03T00:00:00.000Z',
    updatedAt: '2026-09-03T00:00:00.000Z',
  };

  describe('Mapping Functions', () => {
    it('maps database snake_case row to frontend camelCase StoredWorkspace', () => {
      const result = mapRowToStoredWorkspace(sampleRow);
      expect(result).toEqual(sampleWorkspace);
    });

    it('maps frontend camelCase StoredWorkspace to database snake_case row', () => {
      const result = mapWorkspaceToRow(sampleWorkspace, 'user-uuid-123');
      expect(result).toEqual({
        user_id: 'user-uuid-123',
        couple_name: 'Adit & Nisa',
        wedding_date: '2027-02-14',
        estimated_budget: 150000000,
        estimated_guest_count: 500,
        primary_planning_priority: 'timeline',
        completed_categories: ['venue', 'catering'],
        religious_contexts: [],
        cultural_context: {
          hasTradition: null,
          description: null,
        },
        updated_at: '2026-09-03T00:00:00.000Z',
      });
    });
  });

  describe('fetchWorkspaceByUserId', () => {
    it('returns StoredWorkspace when a workspace exists for the user', async () => {
      const maybeSingleMock = vi.fn().mockResolvedValueOnce({
        data: sampleRow,
        error: null,
      });
      const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

      const result = await fetchWorkspaceByUserId('user-uuid-123');

      expect(supabase.from).toHaveBeenCalledWith('workspaces');
      expect(selectMock).toHaveBeenCalledWith('*');
      expect(eqMock).toHaveBeenCalledWith('user_id', 'user-uuid-123');
      expect(result).toEqual(sampleWorkspace);
    });

    it('returns null when no workspace exists for user', async () => {
      const maybeSingleMock = vi.fn().mockResolvedValueOnce({
        data: null,
        error: null,
      });
      const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

      const result = await fetchWorkspaceByUserId('user-no-workspace');
      expect(result).toBeNull();
    });

    it('returns null if userId is empty', async () => {
      const result = await fetchWorkspaceByUserId('');
      expect(result).toBeNull();
    });

    it('throws error when Supabase query fails', async () => {
      const maybeSingleMock = vi.fn().mockResolvedValueOnce({
        data: null,
        error: new Error('Database connection failed'),
      });
      const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

      await expect(fetchWorkspaceByUserId('user-uuid-123')).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('insertWorkspace', () => {
    it('inserts a workspace with authenticated userId and returns inserted row', async () => {
      const singleMock = vi.fn().mockResolvedValueOnce({
        data: sampleRow,
        error: null,
      });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

      const input = {
        coupleName: 'Adit & Nisa',
        weddingDate: '2027-02-14',
        estimatedBudget: 150000000,
        estimatedGuestCount: 500,
        primaryPlanningPriority: 'timeline' as const,
        completedCategories: ['venue', 'catering'] as any,
        religiousContexts: [],
        culturalContext: {
          hasTradition: null,
          description: null,
        },
      };

      const result = await insertWorkspace(input, 'user-uuid-123');

      expect(supabase.from).toHaveBeenCalledWith('workspaces');
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-uuid-123',
          couple_name: 'Adit & Nisa',
          wedding_date: '2027-02-14',
        })
      );
      expect(result).toEqual(sampleWorkspace);
    });

    it('throws error if userId is missing', async () => {
      await expect(
        insertWorkspace(
          {
            coupleName: 'Adit & Nisa',
            weddingDate: '2027-02-14',
            estimatedBudget: 100000000,
            estimatedGuestCount: 400,
            primaryPlanningPriority: 'checklist',
            completedCategories: [],
            religiousContexts: [],
            culturalContext: {
              hasTradition: null,
              description: null,
            },
          },
          ''
        )
      ).rejects.toThrow('User ID is required to create a workspace in Supabase.');
    });
  });

  describe('updateWorkspace', () => {
    it('updates workspace and returns updated row', async () => {
      const updatedRow = { ...sampleRow, couple_name: 'Aditya & Annisa' };
      const singleMock = vi.fn().mockResolvedValueOnce({
        data: updatedRow,
        error: null,
      });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const eqMock = vi.fn().mockReturnValue({ select: selectMock });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as any);

      const result = await updateWorkspace({
        ...sampleWorkspace,
        coupleName: 'Aditya & Annisa',
      });

      expect(supabase.from).toHaveBeenCalledWith('workspaces');
      expect(eqMock).toHaveBeenCalledWith('id', sampleWorkspace.id);
      expect(result.coupleName).toBe('Aditya & Annisa');
    });

    it('falls back gracefully to base payload when schema returns PGRST204 column error', async () => {
      const pgrstError = { code: 'PGRST204', message: "Could not find 'cultural_context' column" };
      const singleMock = vi
        .fn()
        .mockResolvedValueOnce({ data: null, error: pgrstError })
        .mockResolvedValueOnce({ data: sampleRow, error: null });

      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

      const result = await insertWorkspace(
        {
          coupleName: 'Adit & Nisa',
          weddingDate: '2027-02-14',
          estimatedBudget: 150000000,
          estimatedGuestCount: 500,
          primaryPlanningPriority: 'timeline' as const,
          completedCategories: [],
          religiousContexts: [],
          culturalContext: { hasTradition: null, description: null },
        },
        'user-uuid-123'
      );

      expect(result).toEqual(sampleWorkspace);
      expect(insertMock).toHaveBeenCalledTimes(2);
    });
  });
});
