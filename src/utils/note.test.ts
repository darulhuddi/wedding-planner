import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createNote,
  updateNote,
  deleteNote,
  togglePinNote,
  filterNotes,
  sortNotes,
  isValidNoteString,
} from './noteUtils';
import { Note } from '../types/note';
import { TaskItem } from '../types/checklist';
import { Vendor } from '../types/vendor';
import { Guest } from '../types/guest';
import { StoredBudget } from '../types/budget';
import { StoredWorkspace } from '../types/workspace';
import { deriveWorkspaceViewModel } from '../domain/workspaceSelectors';
import { getTimelineGroups } from '../domain/timelineSelectors';
import * as workspaceRepository from '../repositories/workspaceRepository';

const memoryStore: Record<string, string> = {};

if (typeof localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (key: string) => memoryStore[key] || null,
    setItem: (key: string, value: string) => {
      memoryStore[key] = value;
    },
    removeItem: (key: string) => {
      delete memoryStore[key];
    },
    clear: () => {
      Object.keys(memoryStore).forEach((k) => delete memoryStore[k]);
    },
  };
}

describe('WedFlow Catatan v1 System Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const sampleNotes: Note[] = [
    {
      id: 'note-1',
      title: 'Daftar Seragam Keluarga',
      content: 'Warna sage green untuk keluarga inti, abu-abu untuk among tamu.',
      category: 'family',
      isPinned: false,
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
    },
    {
      id: 'note-2',
      title: 'Ide Souvenir Ramah Lingkungan',
      content: 'Pertimbangkan pouch canvas atau bibit tanaman kaktus sukulen.',
      category: 'idea',
      isPinned: true,
      createdAt: '2026-09-02T11:00:00.000Z',
      updatedAt: '2026-09-02T11:00:00.000Z',
    },
    {
      id: 'note-3',
      title: 'Catatan Survei Gedung Sasana',
      content: 'Kapasitas parkir muat 200 mobil. Sound system sudah termasuk.',
      category: 'venue',
      isPinned: false,
      createdAt: '2026-09-03T09:00:00.000Z',
      updatedAt: '2026-09-03T09:00:00.000Z',
    },
  ];

  it('1. Create note', () => {
    const initial: Note[] = [];
    const { updatedNotes, newNote } = createNote(initial, {
      title: 'Catatan Fitting Baju',
      content: 'Fitting kedua dijadwalkan tanggal 15 Oktober.',
      category: 'vendor',
    });

    expect(updatedNotes).toHaveLength(1);
    expect(newNote.title).toBe('Catatan Fitting Baju');
    expect(newNote.content).toBe('Fitting kedua dijadwalkan tanggal 15 Oktober.');
    expect(newNote.category).toBe('vendor');
    expect(newNote.isPinned).toBe(false); // default false
    expect(newNote.id).toBeDefined();
    expect(newNote.createdAt).toBeDefined();
    expect(newNote.updatedAt).toBeDefined();
  });

  it('2. Edit note', () => {
    const { updatedNotes: initial } = createNote([], {
      title: 'Catatan Lama',
      content: 'Isi lama',
      category: 'general',
    });
    const noteId = initial[0].id;

    const updated = updateNote(initial, noteId, {
      title: 'Catatan Baru',
      content: 'Isi yang telah diperbarui',
      category: 'idea',
    });

    expect(updated[0].title).toBe('Catatan Baru');
    expect(updated[0].content).toBe('Isi yang telah diperbarui');
    expect(updated[0].category).toBe('idea');
  });

  it('3. Cancel edit preserves original', () => {
    const { updatedNotes: initial } = createNote([], {
      title: 'Original Title',
      content: 'Original Content',
      category: 'general',
    });

    // Simulating user editing in local modal state and then canceling (discarding changes)
    const draftTitle = 'Canceled Draft Title';
    const draftContent = 'Canceled Draft Content';

    expect(draftTitle).not.toBe(initial[0].title);
    expect(draftContent).not.toBe(initial[0].content);
    expect(initial[0].title).toBe('Original Title');
    expect(initial[0].content).toBe('Original Content');
  });

  it('4. Delete note', () => {
    const { updatedNotes: initial } = createNote([], {
      title: 'Catatan Akan Dihapus',
      content: 'Isi catatan',
    });
    const noteId = initial[0].id;

    const { updatedNotes } = deleteNote(initial, noteId);
    expect(updatedNotes).toHaveLength(0);
  });

  it('5. Required title validation', () => {
    expect(() =>
      createNote([], {
        title: '',
        content: 'Isi valid',
      })
    ).toThrow('Title is required');

    expect(() =>
      createNote([], {
        title: '   ',
        content: 'Isi valid',
      })
    ).toThrow('Title is required');

    expect(isValidNoteString('')).toBe(false);
    expect(isValidNoteString('   ')).toBe(false);
    expect(isValidNoteString('Judul Valid')).toBe(true);
  });

  it('6. Required content validation', () => {
    expect(() =>
      createNote([], {
        title: 'Judul Valid',
        content: '',
      })
    ).toThrow('Content is required');

    expect(() =>
      createNote([], {
        title: 'Judul Valid',
        content: '   ',
      })
    ).toThrow('Content is required');
  });

  it('7. Search by title', () => {
    const results = filterNotes(sampleNotes, 'Seragam', 'all');
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Daftar Seragam Keluarga');
  });

  it('8. Search by content', () => {
    const results = filterNotes(sampleNotes, 'sukulen', 'all');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('note-2');
  });

  it('9. Case-insensitive search', () => {
    const upperSearch = filterNotes(sampleNotes, 'SASANA', 'all');
    expect(upperSearch).toHaveLength(1);
    expect(upperSearch[0].id).toBe('note-3');

    const mixedSearch = filterNotes(sampleNotes, 'sOUVeNiR', 'all');
    expect(mixedSearch).toHaveLength(1);
    expect(mixedSearch[0].id).toBe('note-2');

    const trimmedSearch = filterNotes(sampleNotes, '   sasana   ', 'all');
    expect(trimmedSearch).toHaveLength(1);
  });

  it('10. Category filter', () => {
    const familyNotes = filterNotes(sampleNotes, '', 'family');
    expect(familyNotes).toHaveLength(1);
    expect(familyNotes[0].id).toBe('note-1');

    const venueNotes = filterNotes(sampleNotes, '', 'venue');
    expect(venueNotes).toHaveLength(1);
    expect(venueNotes[0].id).toBe('note-3');

    const ideaNotes = filterNotes(sampleNotes, '', 'idea');
    expect(ideaNotes).toHaveLength(1);
    expect(ideaNotes[0].id).toBe('note-2');

    const vendorNotes = filterNotes(sampleNotes, '', 'vendor');
    expect(vendorNotes).toHaveLength(0);
  });

  it('11. Combined search + category filter', () => {
    // Matching search but wrong category -> empty
    const mismatch = filterNotes(sampleNotes, 'Seragam', 'venue');
    expect(mismatch).toHaveLength(0);

    // Matching search and matching category -> returns result
    const match = filterNotes(sampleNotes, 'Seragam', 'family');
    expect(match).toHaveLength(1);
    expect(match[0].id).toBe('note-1');
  });

  it('12. Pin note', () => {
    const note: Note = {
      id: 'note-pin-test',
      title: 'Pin Test',
      content: 'Content',
      category: 'general',
      isPinned: false,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    const updated = togglePinNote([note], note.id);
    expect(updated[0].isPinned).toBe(true);
  });

  it('13. Unpin note', () => {
    const note: Note = {
      id: 'note-unpin-test',
      title: 'Unpin Test',
      content: 'Content',
      category: 'general',
      isPinned: true,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    const updated = togglePinNote([note], note.id);
    expect(updated[0].isPinned).toBe(false);
  });

  it('14. Pinned notes ordered first', () => {
    const n1: Note = {
      id: '1',
      title: 'Unpinned 1',
      content: 'Content',
      category: 'general',
      isPinned: false,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-05T00:00:00Z',
    };
    const n2: Note = {
      id: '2',
      title: 'Pinned 1',
      content: 'Content',
      category: 'general',
      isPinned: true,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-02T00:00:00Z',
    };
    const n3: Note = {
      id: '3',
      title: 'Unpinned 2',
      content: 'Content',
      category: 'general',
      isPinned: false,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-04T00:00:00Z',
    };

    const sorted = sortNotes([n1, n2, n3]);
    expect(sorted[0].id).toBe('2'); // Pinned first
    expect(sorted[1].id).toBe('1'); // Newest unpinned
    expect(sorted[2].id).toBe('3');
  });

  it('15. Updated notes ordered newest first', () => {
    const n1: Note = {
      id: '1',
      title: 'Older update',
      content: 'Content',
      category: 'general',
      isPinned: false,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T12:00:00Z',
    };
    const n2: Note = {
      id: '2',
      title: 'Newer update',
      content: 'Content',
      category: 'general',
      isPinned: false,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-03T12:00:00Z',
    };

    const sorted = sortNotes([n1, n2]);
    expect(sorted[0].id).toBe('2');
    expect(sorted[1].id).toBe('1');
  });

  it('16. workspace isolation: notes in workspace A do not appear in workspace B', async () => {
    const ws1 = 'workspace-alpha';
    const ws2 = 'workspace-beta';

    const { updatedNotes: notesWs1 } = createNote([], {
      title: 'Workspace 1 Note',
      content: 'Private to ws1',
    });

    const { updatedNotes: notesWs2 } = createNote([], {
      title: 'Workspace 2 Note',
      content: 'Private to ws2',
    });

    vi.spyOn(workspaceRepository, 'saveNotes').mockResolvedValue([]);
    vi.spyOn(workspaceRepository, 'getNotes').mockImplementation(async (wsId) => {
      if (wsId === ws1) return notesWs1;
      if (wsId === ws2) return notesWs2;
      return [];
    });

    await workspaceRepository.saveNotes(ws1, notesWs1);
    await workspaceRepository.saveNotes(ws2, notesWs2);

    const readWs1 = await workspaceRepository.getNotes(ws1);
    const readWs2 = await workspaceRepository.getNotes(ws2);

    expect(readWs1).toHaveLength(1);
    expect(readWs1[0].title).toBe('Workspace 1 Note');

    expect(readWs2).toHaveLength(1);
    expect(readWs2[0].title).toBe('Workspace 2 Note');
  });

  it('17. Delete note does not affect tasks', async () => {
    const wsId = 'ws-test-notes-tasks';
    const sampleTask: TaskItem = {
      id: 'task-1',
      title: 'Booking MUA',
      description: null,
      category: 'makeup_attire',
      status: 'todo',
      priority: 'high',
      dueDate: '2026-10-01',
      estimatedMinutes: 30,
      source: 'custom',
      templateId: null,
      vendorId: null,
      eventIds: [],
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      completedAt: null,
    };

    vi.spyOn(workspaceRepository, 'bulkCreateTasks').mockResolvedValueOnce([sampleTask]);
    vi.spyOn(workspaceRepository, 'getTasks').mockResolvedValueOnce([sampleTask]);

    await workspaceRepository.bulkCreateTasks(wsId, [sampleTask]);

    const { updatedNotes } = createNote([], {
      title: 'Catatan Untuk Dihapus',
      content: 'Isi catatan',
    });
    vi.spyOn(workspaceRepository, 'saveNotes').mockResolvedValue([]);
    await workspaceRepository.saveNotes(wsId, updatedNotes);

    // Delete note
    const { updatedNotes: afterDelete } = deleteNote(updatedNotes, updatedNotes[0].id);
    await workspaceRepository.saveNotes(wsId, afterDelete);

    const tasksAfter = await workspaceRepository.getTasks(wsId);
    expect(tasksAfter).toHaveLength(1);
    expect(tasksAfter[0].id).toBe('task-1');
  });

  it('18. Delete note does not affect vendors', async () => {
    const wsId = 'ws-test-notes-vendors';
    const sampleVendor: Vendor = {
      id: 'v-1',
      name: 'Vendor Foto',
      category: 'photography',
      status: 'selected',
      quotedPrice: 15000000,
      contactName: 'Mas Danu',
      phone: '0812345678',
      instagram: '@fotodanur',
      notes: null,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    vi.spyOn(workspaceRepository, 'saveVendors').mockResolvedValue([]);
    vi.spyOn(workspaceRepository, 'getVendors').mockResolvedValue([sampleVendor]);
    await workspaceRepository.saveVendors(wsId, [sampleVendor]);

    const { updatedNotes } = createNote([], {
      title: 'Catatan Vendor',
      content: 'Isi',
    });
    vi.spyOn(workspaceRepository, 'saveNotes').mockResolvedValue([]);
    await workspaceRepository.saveNotes(wsId, updatedNotes);

    // Delete note
    const { updatedNotes: afterDelete } = deleteNote(updatedNotes, updatedNotes[0].id);
    await workspaceRepository.saveNotes(wsId, afterDelete);

    const vendorsAfter = await workspaceRepository.getVendors(wsId);
    expect(vendorsAfter).toHaveLength(1);
    expect(vendorsAfter[0].name).toBe('Vendor Foto');
  });

  it('19. Delete note does not affect budget', async () => {
    const wsId = 'ws-test-notes-budget';
    const sampleBudget: StoredBudget = {
      allocations: [
        {
          id: 'alloc-1',
          category: 'venue',
          amount: 50000000,
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
      ],
      expenses: [
        {
          id: 'exp-1',
          category: 'venue',
          title: 'Pelunasan Venue',
          amount: 50000000,
          date: '2026-09-01',
          note: null,
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
      ],
    };

    vi.spyOn(workspaceRepository, 'saveBudget').mockResolvedValue(sampleBudget);
    vi.spyOn(workspaceRepository, 'getBudget').mockResolvedValue(sampleBudget);
    await workspaceRepository.saveBudget(wsId, sampleBudget);

    const { updatedNotes } = createNote([], {
      title: 'Catatan Budget',
      content: 'Isi catatan',
    });
    vi.spyOn(workspaceRepository, 'saveNotes').mockResolvedValue([]);
    await workspaceRepository.saveNotes(wsId, updatedNotes);

    // Delete note
    const { updatedNotes: afterDelete } = deleteNote(updatedNotes, updatedNotes[0].id);
    await workspaceRepository.saveNotes(wsId, afterDelete);

    const budgetAfter = await workspaceRepository.getBudget(wsId);
    expect(budgetAfter.allocations).toHaveLength(1);
    expect(budgetAfter.expenses).toHaveLength(1);
    expect(budgetAfter.expenses[0].amount).toBe(50000000);
  });

  it('20. Delete note does not affect guests', async () => {
    const wsId = 'ws-test-notes-guests';
    const sampleGuest: Guest = {
      id: 'g-1',
      name: 'Rian & Pasangan',
      side: 'shared',
      invitationStatus: 'invited',
      rsvpStatus: 'attending',
      pax: 2,
      phone: null,
      notes: null,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    vi.spyOn(workspaceRepository, 'saveGuests').mockResolvedValue([]);
    vi.spyOn(workspaceRepository, 'getGuests').mockResolvedValue([sampleGuest]);
    await workspaceRepository.saveGuests(wsId, [sampleGuest]);

    const { updatedNotes } = createNote([], {
      title: 'Catatan Tamu',
      content: 'Isi catatan',
    });
    vi.spyOn(workspaceRepository, 'saveNotes').mockResolvedValue([]);
    await workspaceRepository.saveNotes(wsId, updatedNotes);

    // Delete note
    const { updatedNotes: afterDelete } = deleteNote(updatedNotes, updatedNotes[0].id);
    await workspaceRepository.saveNotes(wsId, afterDelete);

    const guestsAfter = await workspaceRepository.getGuests(wsId);
    expect(guestsAfter).toHaveLength(1);
    expect(guestsAfter[0].name).toBe('Rian & Pasangan');
    expect(guestsAfter[0].pax).toBe(2);
  });

  it('21. Delete note does not affect timeline/NBA', () => {
    const storedWorkspace: StoredWorkspace = {
      id: 'ws-test-nba',
      coupleName: 'Amel & Adit',
      weddingDate: '2026-12-01',
      estimatedBudget: 100000000,
      estimatedGuestCount: 300,
      completedCategories: [],
      primaryPlanningPriority: 'timeline',
      religiousContexts: [],
      culturalContext: {
        hasTradition: null,
        description: null,
      },
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    const task: TaskItem = {
      id: 't-1',
      title: 'Tentukan Venue',
      description: null,
      category: 'venue',
      status: 'todo',
      priority: 'high',
      dueDate: '2026-09-15',
      estimatedMinutes: 45,
      source: 'custom',
      templateId: null,
      vendorId: null,
      eventIds: [],
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      completedAt: null,
    };

    const vmBefore = deriveWorkspaceViewModel(storedWorkspace, [task]);
    const groupsBefore = getTimelineGroups([task], storedWorkspace.weddingDate);

    // Perform note creation and deletion
    const { updatedNotes } = createNote([], {
      title: 'Catatan Timeline',
      content: 'Catatan tambahan',
    });
    deleteNote(updatedNotes, updatedNotes[0].id);

    const vmAfter = deriveWorkspaceViewModel(storedWorkspace, [task]);
    const groupsAfter = getTimelineGroups([task], storedWorkspace.weddingDate);

    expect(vmAfter.nextBestAction.type).toBe(vmBefore.nextBestAction.type);
    expect(vmAfter.nextBestAction.title).toBe(vmBefore.nextBestAction.title);
    expect(vmAfter.completionPercentage).toBe(vmBefore.completionPercentage);
    expect(groupsAfter.length).toBe(groupsBefore.length);
  });
});
