import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../lib/supabaseClient';
import {
  mapRowToWeddingEvent,
  mapWeddingEventToRow,
  fetchEventsByWorkspaceId,
  fetchEventById,
  insertWeddingEvent,
  updateWeddingEventInDb,
  deleteWeddingEventFromDb,
  SupabaseWeddingEventRow,
} from './supabaseEventAdapter';
import { WeddingEvent } from '../domain/events';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('supabaseEventAdapter Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleWorkspaceId = 'w1111111-1111-4111-8111-111111111111';
  const sampleEventId = 'e1111111-1111-4111-8111-111111111111';

  const sampleRow: SupabaseWeddingEventRow = {
    id: sampleEventId,
    workspace_id: sampleWorkspaceId,
    type: 'ceremony',
    name: 'Akad Nikah',
    date: '2027-06-20',
    start_time: '08:00',
    end_time: '11:00',
    location: 'Masjid Agung',
    created_at: '2026-09-03T00:00:00.000Z',
    updated_at: '2026-09-03T00:00:00.000Z',
  };

  const sampleDomainEvent: WeddingEvent = {
    id: sampleEventId,
    workspaceId: sampleWorkspaceId,
    type: 'ceremony',
    name: 'Akad Nikah',
    date: '2027-06-20',
    startTime: '08:00',
    endTime: '11:00',
    location: 'Masjid Agung',
    createdAt: '2026-09-03T00:00:00.000Z',
    updatedAt: '2026-09-03T00:00:00.000Z',
  };

  describe('Mapping Functions', () => {
    it('maps database snake_case row to domain model', () => {
      expect(mapRowToWeddingEvent(sampleRow)).toEqual(sampleDomainEvent);
    });

    it('maps domain model to database snake_case row', () => {
      const row = mapWeddingEventToRow(sampleDomainEvent, sampleWorkspaceId);
      expect(row.workspace_id).toBe(sampleWorkspaceId);
      expect(row.name).toBe('Akad Nikah');
      expect(row.start_time).toBe('08:00');
      expect(row.end_time).toBe('11:00');
    });
  });

  describe('fetchEventsByWorkspaceId', () => {
    it('fetches events scoped by workspace_id and ordered by date', async () => {
      const orderMock = vi.fn().mockResolvedValueOnce({
        data: [sampleRow],
        error: null,
      });
      const eqMock = vi.fn().mockReturnValue({ order: orderMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

      const events = await fetchEventsByWorkspaceId(sampleWorkspaceId);

      expect(supabase.from).toHaveBeenCalledWith('wedding_events');
      expect(selectMock).toHaveBeenCalledWith('*');
      expect(eqMock).toHaveBeenCalledWith('workspace_id', sampleWorkspaceId);
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(sampleDomainEvent);
    });
  });

  describe('fetchEventById', () => {
    it('fetches single event scoped by id and workspace_id', async () => {
      const maybeSingleMock = vi.fn().mockResolvedValueOnce({
        data: sampleRow,
        error: null,
      });
      const eqWorkspaceMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const eqIdMock = vi.fn().mockReturnValue({ eq: eqWorkspaceMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqIdMock });
      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

      const event = await fetchEventById(sampleWorkspaceId, sampleEventId);

      expect(eqIdMock).toHaveBeenCalledWith('id', sampleEventId);
      expect(eqWorkspaceMock).toHaveBeenCalledWith('workspace_id', sampleWorkspaceId);
      expect(event).toEqual(sampleDomainEvent);
    });
  });

  describe('insertWeddingEvent', () => {
    it('inserts event with workspace_id payload', async () => {
      const singleMock = vi.fn().mockResolvedValueOnce({
        data: sampleRow,
        error: null,
      });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

      const created = await insertWeddingEvent(sampleWorkspaceId, {
        name: 'Akad Nikah',
        type: 'ceremony',
        date: '2027-06-20',
        startTime: '08:00',
        endTime: '11:00',
        location: 'Masjid Agung',
      });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          workspace_id: sampleWorkspaceId,
          name: 'Akad Nikah',
          type: 'ceremony',
        })
      );
      expect(created).toEqual(sampleDomainEvent);
    });
  });

  describe('updateWeddingEventInDb', () => {
    it('updates event scoped by id and workspace_id', async () => {
      const updatedRow = { ...sampleRow, name: 'Akad Nikah & Syukuran' };
      const singleMock = vi.fn().mockResolvedValueOnce({
        data: updatedRow,
        error: null,
      });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const eqWorkspaceMock = vi.fn().mockReturnValue({ select: selectMock });
      const eqIdMock = vi.fn().mockReturnValue({ eq: eqWorkspaceMock });
      const updateMock = vi.fn().mockReturnValue({ eq: eqIdMock });
      vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as any);

      const updated = await updateWeddingEventInDb(sampleWorkspaceId, sampleEventId, {
        name: 'Akad Nikah & Syukuran',
      });

      expect(eqIdMock).toHaveBeenCalledWith('id', sampleEventId);
      expect(eqWorkspaceMock).toHaveBeenCalledWith('workspace_id', sampleWorkspaceId);
      expect(updated.name).toBe('Akad Nikah & Syukuran');
    });
  });

  describe('deleteWeddingEventFromDb', () => {
    it('deletes event and cleans up task event_ids without deleting tasks', async () => {
      const eqWorkspaceMock = vi.fn().mockResolvedValueOnce({ error: null });
      const eqIdMock = vi.fn().mockReturnValue({ eq: eqWorkspaceMock });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqIdMock });

      // Mock task disassociation query
      const taskContainsMock = vi.fn().mockResolvedValueOnce({
        data: [{ id: 'task-1', event_ids: [sampleEventId, 'other-event'] }],
        error: null,
      });
      const taskEqWorkspaceMock = vi.fn().mockReturnValue({ contains: taskContainsMock });
      const taskSelectMock = vi.fn().mockReturnValue({ eq: taskEqWorkspaceMock });

      const taskUpdateEqWsMock = vi.fn().mockResolvedValueOnce({ error: null });
      const taskUpdateEqIdMock = vi.fn().mockReturnValue({ eq: taskUpdateEqWsMock });
      const taskUpdateMock = vi.fn().mockReturnValue({ eq: taskUpdateEqIdMock });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'wedding_events') {
          return { delete: deleteMock } as any;
        }
        if (table === 'tasks') {
          return {
            select: taskSelectMock,
            update: taskUpdateMock,
          } as any;
        }
        return {} as any;
      });

      await deleteWeddingEventFromDb(sampleWorkspaceId, sampleEventId);

      // Event was deleted
      expect(deleteMock).toHaveBeenCalled();
      expect(eqIdMock).toHaveBeenCalledWith('id', sampleEventId);
      expect(eqWorkspaceMock).toHaveBeenCalledWith('workspace_id', sampleWorkspaceId);

      // Tasks table was queried and updated to disassociate sampleEventId
      expect(taskUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          event_ids: ['other-event'],
        })
      );
    });
  });
});
