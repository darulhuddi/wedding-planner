import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../lib/supabaseClient';
import {
  mapRowToVendor,
  mapVendorToRow,
  fetchVendorsByWorkspaceId,
  insertVendor,
  updateVendorInDb,
  deleteVendorFromDb,
  SupabaseVendorRow,
} from './supabaseVendorAdapter';
import { Vendor } from '../types/vendor';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('supabaseVendorAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleWorkspaceId = 'w1111111-1111-4111-8111-111111111111';

  const sampleRow: SupabaseVendorRow = {
    id: 'v2222222-2222-4222-8222-222222222222',
    workspace_id: sampleWorkspaceId,
    name: 'The Royal Ballroom',
    category: 'venue',
    status: 'selected',
    quoted_price: 75000000,
    contact_name: 'Pak Hendra',
    phone: '081234567890',
    instagram: '@royalballroom',
    notes: 'Kapasitas 600 tamu',
    created_at: '2026-09-03T00:00:00.000Z',
    updated_at: '2026-09-03T00:00:00.000Z',
  };

  const sampleVendor: Vendor = {
    id: 'v2222222-2222-4222-8222-222222222222',
    name: 'The Royal Ballroom',
    category: 'venue',
    status: 'selected',
    quotedPrice: 75000000,
    contactName: 'Pak Hendra',
    phone: '081234567890',
    instagram: '@royalballroom',
    notes: 'Kapasitas 600 tamu',
    createdAt: '2026-09-03T00:00:00.000Z',
    updatedAt: '2026-09-03T00:00:00.000Z',
  };

  describe('Mapping Functions', () => {
    it('maps database snake_case row to frontend Vendor model', () => {
      const result = mapRowToVendor(sampleRow);
      expect(result).toEqual(sampleVendor);
    });

    it('maps frontend Vendor to database snake_case row with workspace_id', () => {
      const result = mapVendorToRow(sampleVendor, sampleWorkspaceId);
      expect(result).toEqual(sampleRow);
    });
  });

  describe('fetchVendorsByWorkspaceId', () => {
    it('queries vendors scoped by workspace_id and returns mapped array', async () => {
      const orderMock = vi.fn().mockResolvedValueOnce({
        data: [sampleRow],
        error: null,
      });
      const eqMock = vi.fn().mockReturnValue({ order: orderMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

      const vendors = await fetchVendorsByWorkspaceId(sampleWorkspaceId);

      expect(supabase.from).toHaveBeenCalledWith('vendors');
      expect(selectMock).toHaveBeenCalledWith('*');
      expect(eqMock).toHaveBeenCalledWith('workspace_id', sampleWorkspaceId);
      expect(vendors).toHaveLength(1);
      expect(vendors[0].name).toBe('The Royal Ballroom');
    });

    it('returns empty array if workspaceId is empty', async () => {
      const result = await fetchVendorsByWorkspaceId('');
      expect(result).toEqual([]);
    });
  });

  describe('insertVendor', () => {
    it('inserts a single vendor and returns mapped Vendor', async () => {
      const singleMock = vi.fn().mockResolvedValueOnce({
        data: sampleRow,
        error: null,
      });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

      const result = await insertVendor(sampleWorkspaceId, sampleVendor);

      expect(supabase.from).toHaveBeenCalledWith('vendors');
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          workspace_id: sampleWorkspaceId,
          name: sampleVendor.name,
        })
      );
      expect(result).toEqual(sampleVendor);
    });
  });

  describe('updateVendorInDb', () => {
    it('updates vendor scoped by id and workspace_id', async () => {
      const updatedRow = { ...sampleRow, status: 'contacted' as const };
      const singleMock = vi.fn().mockResolvedValueOnce({
        data: updatedRow,
        error: null,
      });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const eqWorkspaceMock = vi.fn().mockReturnValue({ select: selectMock });
      const eqIdMock = vi.fn().mockReturnValue({ eq: eqWorkspaceMock });
      const updateMock = vi.fn().mockReturnValue({ eq: eqIdMock });
      vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as any);

      const result = await updateVendorInDb(sampleWorkspaceId, {
        ...sampleVendor,
        status: 'contacted',
      });

      expect(supabase.from).toHaveBeenCalledWith('vendors');
      expect(eqIdMock).toHaveBeenCalledWith('id', sampleVendor.id);
      expect(eqWorkspaceMock).toHaveBeenCalledWith('workspace_id', sampleWorkspaceId);
      expect(result.status).toBe('contacted');
    });
  });

  describe('deleteVendorFromDb', () => {
    it('disassociates tasks and deletes vendor scoped by id and workspace_id', async () => {
      // 1. Mock tasks disassociation update
      const eqTasksWorkspaceMock = vi.fn().mockResolvedValueOnce({ error: null });
      const eqTasksVendorMock = vi.fn().mockReturnValue({ eq: eqTasksWorkspaceMock });
      const updateTasksMock = vi.fn().mockReturnValue({ eq: eqTasksVendorMock });

      // 2. Mock vendor deletion
      const eqVendorWorkspaceMock = vi.fn().mockResolvedValueOnce({ error: null });
      const eqVendorIdMock = vi.fn().mockReturnValue({ eq: eqVendorWorkspaceMock });
      const deleteVendorMock = vi.fn().mockReturnValue({ eq: eqVendorIdMock });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'tasks') {
          return { update: updateTasksMock } as any;
        }
        if (table === 'vendors') {
          return { delete: deleteVendorMock } as any;
        }
        return {} as any;
      });

      await deleteVendorFromDb(sampleWorkspaceId, sampleVendor.id);

      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(updateTasksMock).toHaveBeenCalledWith(
        expect.objectContaining({ vendor_id: null })
      );
      expect(supabase.from).toHaveBeenCalledWith('vendors');
      expect(eqVendorIdMock).toHaveBeenCalledWith('id', sampleVendor.id);
      expect(eqVendorWorkspaceMock).toHaveBeenCalledWith('workspace_id', sampleWorkspaceId);
    });
  });
});
