import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../lib/supabaseClient';
import {
  mapRowToGuest,
  mapGuestToRow,
  fetchGuestsByWorkspaceId,
  insertGuest,
  updateGuestInDb,
  deleteGuestFromDb,
  SupabaseGuestRow,
} from './supabaseGuestAdapter';
import { Guest } from '../types/guest';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('supabaseGuestAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleWorkspaceId = 'w1111111-1111-4111-8111-111111111111';

  const sampleRow: SupabaseGuestRow = {
    id: 'g1111111-1111-4111-8111-111111111111',
    workspace_id: sampleWorkspaceId,
    name: 'Keluarga Budi Santoso',
    side: 'groom',
    invitation_status: 'invited',
    rsvp_status: 'attending',
    pax: 4,
    phone: '081234567890',
    notes: 'Meja VIP A',
    created_at: '2026-09-03T00:00:00.000Z',
    updated_at: '2026-09-03T00:00:00.000Z',
  };

  const sampleGuest: Guest = {
    id: 'g1111111-1111-4111-8111-111111111111',
    name: 'Keluarga Budi Santoso',
    side: 'groom',
    invitationStatus: 'invited',
    rsvpStatus: 'attending',
    pax: 4,
    phone: '081234567890',
    notes: 'Meja VIP A',
    createdAt: '2026-09-03T00:00:00.000Z',
    updatedAt: '2026-09-03T00:00:00.000Z',
  };

  describe('Mapping Functions', () => {
    it('maps database snake_case row to frontend Guest model', () => {
      const result = mapRowToGuest(sampleRow);
      expect(result).toEqual(sampleGuest);
      expect(result.pax).toBe(4);
    });

    it('maps frontend Guest to database snake_case row with workspace_id', () => {
      const result = mapGuestToRow(sampleGuest, sampleWorkspaceId);
      expect(result).toEqual(sampleRow);
    });
  });

  describe('fetchGuestsByWorkspaceId', () => {
    it('queries guests scoped by workspace_id and returns mapped array', async () => {
      const orderMock = vi.fn().mockResolvedValueOnce({
        data: [sampleRow],
        error: null,
      });
      const eqMock = vi.fn().mockReturnValue({ order: orderMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

      const guests = await fetchGuestsByWorkspaceId(sampleWorkspaceId);

      expect(supabase.from).toHaveBeenCalledWith('guests');
      expect(selectMock).toHaveBeenCalledWith('*');
      expect(eqMock).toHaveBeenCalledWith('workspace_id', sampleWorkspaceId);
      expect(guests).toHaveLength(1);
      expect(guests[0].name).toBe('Keluarga Budi Santoso');
    });
  });

  describe('Guest CRUD', () => {
    it('insertGuest inserts a new guest', async () => {
      const singleMock = vi.fn().mockResolvedValueOnce({
        data: sampleRow,
        error: null,
      });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

      const result = await insertGuest(sampleWorkspaceId, sampleGuest);
      expect(result.pax).toBe(4);
    });

    it('updateGuestInDb updates guest scoped by id and workspace_id', async () => {
      const updatedRow = { ...sampleRow, rsvp_status: 'not_attending' as const };
      const singleMock = vi.fn().mockResolvedValueOnce({
        data: updatedRow,
        error: null,
      });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const eqWorkspaceMock = vi.fn().mockReturnValue({ select: selectMock });
      const eqIdMock = vi.fn().mockReturnValue({ eq: eqWorkspaceMock });
      const updateMock = vi.fn().mockReturnValue({ eq: eqIdMock });
      vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as any);

      const result = await updateGuestInDb(sampleWorkspaceId, {
        ...sampleGuest,
        rsvpStatus: 'not_attending',
      });

      expect(eqIdMock).toHaveBeenCalledWith('id', sampleGuest.id);
      expect(eqWorkspaceMock).toHaveBeenCalledWith('workspace_id', sampleWorkspaceId);
      expect(result.rsvpStatus).toBe('not_attending');
    });

    it('deleteGuestFromDb deletes guest scoped by id and workspace_id', async () => {
      const eqWorkspaceMock = vi.fn().mockResolvedValueOnce({ error: null });
      const eqIdMock = vi.fn().mockReturnValue({ eq: eqWorkspaceMock });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqIdMock });
      vi.mocked(supabase.from).mockReturnValue({ delete: deleteMock } as any);

      await deleteGuestFromDb(sampleWorkspaceId, sampleGuest.id);

      expect(eqIdMock).toHaveBeenCalledWith('id', sampleGuest.id);
      expect(eqWorkspaceMock).toHaveBeenCalledWith('workspace_id', sampleWorkspaceId);
    });
  });
});
