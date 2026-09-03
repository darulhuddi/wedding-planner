import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../lib/supabaseClient';
import {
  mapRowToNote,
  mapNoteToRow,
  fetchNotesByWorkspaceId,
  insertNote,
  updateNoteInDb,
  deleteNoteFromDb,
  SupabaseNoteRow,
} from './supabaseNoteAdapter';
import { Note } from '../types/note';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('supabaseNoteAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleWorkspaceId = 'w1111111-1111-4111-8111-111111111111';

  const sampleRow: SupabaseNoteRow = {
    id: 'n1111111-1111-4111-8111-111111111111',
    workspace_id: sampleWorkspaceId,
    title: 'Catatan Konsep Acara',
    content: 'Tema adat Jawa modern warna burgundy dan ivory',
    category: 'idea',
    is_pinned: true,
    created_at: '2026-09-03T00:00:00.000Z',
    updated_at: '2026-09-03T00:00:00.000Z',
  };

  const sampleNote: Note = {
    id: 'n1111111-1111-4111-8111-111111111111',
    title: 'Catatan Konsep Acara',
    content: 'Tema adat Jawa modern warna burgundy dan ivory',
    category: 'idea',
    isPinned: true,
    createdAt: '2026-09-03T00:00:00.000Z',
    updatedAt: '2026-09-03T00:00:00.000Z',
  };

  describe('Mapping Functions', () => {
    it('maps database snake_case row to frontend Note model', () => {
      const result = mapRowToNote(sampleRow);
      expect(result).toEqual(sampleNote);
      expect(result.isPinned).toBe(true);
    });

    it('maps frontend Note to database snake_case row with workspace_id', () => {
      const result = mapNoteToRow(sampleNote, sampleWorkspaceId);
      expect(result).toEqual(sampleRow);
    });
  });

  describe('fetchNotesByWorkspaceId', () => {
    it('queries notes scoped by workspace_id and returns mapped array', async () => {
      const orderMock = vi.fn().mockResolvedValueOnce({
        data: [sampleRow],
        error: null,
      });
      const eqMock = vi.fn().mockReturnValue({ order: orderMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

      const notes = await fetchNotesByWorkspaceId(sampleWorkspaceId);

      expect(supabase.from).toHaveBeenCalledWith('notes');
      expect(selectMock).toHaveBeenCalledWith('*');
      expect(eqMock).toHaveBeenCalledWith('workspace_id', sampleWorkspaceId);
      expect(notes).toHaveLength(1);
      expect(notes[0].title).toBe('Catatan Konsep Acara');
    });
  });

  describe('Note CRUD', () => {
    it('insertNote inserts a new note', async () => {
      const singleMock = vi.fn().mockResolvedValueOnce({
        data: sampleRow,
        error: null,
      });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

      const result = await insertNote(sampleWorkspaceId, sampleNote);
      expect(result.title).toBe('Catatan Konsep Acara');
    });

    it('updateNoteInDb updates note scoped by id and workspace_id', async () => {
      const updatedRow = { ...sampleRow, is_pinned: false };
      const singleMock = vi.fn().mockResolvedValueOnce({
        data: updatedRow,
        error: null,
      });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const eqWorkspaceMock = vi.fn().mockReturnValue({ select: selectMock });
      const eqIdMock = vi.fn().mockReturnValue({ eq: eqWorkspaceMock });
      const updateMock = vi.fn().mockReturnValue({ eq: eqIdMock });
      vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as any);

      const result = await updateNoteInDb(sampleWorkspaceId, {
        ...sampleNote,
        isPinned: false,
      });

      expect(eqIdMock).toHaveBeenCalledWith('id', sampleNote.id);
      expect(eqWorkspaceMock).toHaveBeenCalledWith('workspace_id', sampleWorkspaceId);
      expect(result.isPinned).toBe(false);
    });

    it('deleteNoteFromDb deletes note scoped by id and workspace_id', async () => {
      const eqWorkspaceMock = vi.fn().mockResolvedValueOnce({ error: null });
      const eqIdMock = vi.fn().mockReturnValue({ eq: eqWorkspaceMock });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqIdMock });
      vi.mocked(supabase.from).mockReturnValue({ delete: deleteMock } as any);

      await deleteNoteFromDb(sampleWorkspaceId, sampleNote.id);

      expect(eqIdMock).toHaveBeenCalledWith('id', sampleNote.id);
      expect(eqWorkspaceMock).toHaveBeenCalledWith('workspace_id', sampleWorkspaceId);
    });
  });
});
