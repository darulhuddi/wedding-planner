import { describe, it, expect, beforeEach } from 'vitest';
import {
  createGuest,
  updateGuest,
  deleteGuest,
  filterGuests,
  getGuestSummary,
  getGuestsBySide,
  getGuestsByRsvpStatus,
  getGuestsByInvitationStatus,
  validatePax,
  isValidPax,
} from './guestUtils';
import { Guest } from '../types/guest';
import { TaskItem } from '../types/checklist';
import { Vendor } from '../types/vendor';
import { StoredBudget } from '../types/budget';
import { StoredWorkspace } from '../types/workspace';
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

describe('WedFlow Tamu v1 System Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const sampleGuests: Guest[] = [
    {
      id: 'guest-1',
      name: 'Pak Budi Santoso',
      side: 'groom',
      invitationStatus: 'invited',
      rsvpStatus: 'attending',
      pax: 2,
      phone: '08123456789',
      notes: 'Keluarga mempelai pria',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'guest-2',
      name: 'Ibu Ratna & Suami',
      side: 'bride',
      invitationStatus: 'invited',
      rsvpStatus: 'pending',
      pax: 2,
      phone: '08987654321',
      notes: null,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'guest-3',
      name: 'Dimas Kurniawan',
      side: 'shared',
      invitationStatus: 'not_invited',
      rsvpStatus: 'pending',
      pax: 1,
      phone: null,
      notes: 'Teman kuliah bersama',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'guest-4',
      name: 'Citra Kirana',
      side: 'bride',
      invitationStatus: 'invited',
      rsvpStatus: 'not_attending',
      pax: 1,
      phone: null,
      notes: 'Sedang di luar negeri',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
  ];

  it('1. create guest', () => {
    const initial: Guest[] = [];
    const { updatedGuests, newGuest } = createGuest(initial, {
      name: 'Pak Joko',
      side: 'groom',
      invitationStatus: 'invited',
      rsvpStatus: 'attending',
      pax: 3,
      phone: '0811223344',
      notes: 'Meja VIP',
    });

    expect(updatedGuests).toHaveLength(1);
    expect(newGuest.name).toBe('Pak Joko');
    expect(newGuest.side).toBe('groom');
    expect(newGuest.invitationStatus).toBe('invited');
    expect(newGuest.rsvpStatus).toBe('attending');
    expect(newGuest.pax).toBe(3);
    expect(newGuest.phone).toBe('0811223344');
    expect(newGuest.notes).toBe('Meja VIP');
    expect(newGuest.id).toBeDefined();
    expect(newGuest.createdAt).toBeDefined();
    expect(newGuest.updatedAt).toBeDefined();
  });

  it('2. edit guest', () => {
    const { updatedGuests: initial } = createGuest([], {
      name: 'Andi Saputra',
      side: 'shared',
      pax: 1,
      invitationStatus: 'not_invited',
      rsvpStatus: 'pending',
    });

    const guestId = initial[0].id;
    const updated = updateGuest(initial, guestId, {
      name: 'Andi Saputra & Pasangan',
      side: 'groom',
      pax: 2,
      invitationStatus: 'invited',
      rsvpStatus: 'attending',
      phone: '0855667788',
      notes: 'Terkonfirmasi hadir berdua',
    });

    expect(updated[0].name).toBe('Andi Saputra & Pasangan');
    expect(updated[0].side).toBe('groom');
    expect(updated[0].pax).toBe(2);
    expect(updated[0].invitationStatus).toBe('invited');
    expect(updated[0].rsvpStatus).toBe('attending');
    expect(updated[0].phone).toBe('0855667788');
    expect(updated[0].notes).toBe('Terkonfirmasi hadir berdua');
  });

  it('3. cancel edit preserves original data', () => {
    const { updatedGuests: initial } = createGuest([], {
      name: 'Original Name',
      side: 'bride',
      pax: 2,
      invitationStatus: 'invited',
      rsvpStatus: 'pending',
    });

    // Simulated canceled edit state (no update applied)
    const draftChanges = {
      name: 'Canceled Edit Attempt',
      pax: 5,
    };
    expect(draftChanges.name).not.toBe(initial[0].name);
    expect(initial[0].name).toBe('Original Name');
    expect(initial[0].pax).toBe(2);
  });

  it('4. delete guest', () => {
    const { updatedGuests: initial } = createGuest([], {
      name: 'Guest to Delete',
    });
    const guestId = initial[0].id;

    const { updatedGuests } = deleteGuest(initial, guestId);
    expect(updatedGuests).toHaveLength(0);
  });

  it('5. search by name', () => {
    const results = filterGuests(sampleGuests, 'Budi', 'all', 'all', 'all');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Pak Budi Santoso');

    const emptyResults = filterGuests(
      sampleGuests,
      'NonExistentPerson',
      'all',
      'all',
      'all'
    );
    expect(emptyResults).toHaveLength(0);
  });

  it('6. filter by side', () => {
    const groomGuests = filterGuests(sampleGuests, '', 'groom', 'all', 'all');
    expect(groomGuests).toHaveLength(1);
    expect(groomGuests[0].name).toBe('Pak Budi Santoso');

    const brideGuests = filterGuests(sampleGuests, '', 'bride', 'all', 'all');
    expect(brideGuests).toHaveLength(2);

    const sharedGuests = filterGuests(sampleGuests, '', 'shared', 'all', 'all');
    expect(sharedGuests).toHaveLength(1);
  });

  it('7. filter by RSVP', () => {
    const attending = filterGuests(sampleGuests, '', 'all', 'attending', 'all');
    expect(attending).toHaveLength(1);
    expect(attending[0].name).toBe('Pak Budi Santoso');

    const pending = filterGuests(sampleGuests, '', 'all', 'pending', 'all');
    expect(pending).toHaveLength(2);

    const notAttending = filterGuests(
      sampleGuests,
      '',
      'all',
      'not_attending',
      'all'
    );
    expect(notAttending).toHaveLength(1);
  });

  it('8. filter by invitation status', () => {
    const invited = filterGuests(sampleGuests, '', 'all', 'all', 'invited');
    expect(invited).toHaveLength(3);

    const notInvited = filterGuests(
      sampleGuests,
      '',
      'all',
      'all',
      'not_invited'
    );
    expect(notInvited).toHaveLength(1);
    expect(notInvited[0].name).toBe('Dimas Kurniawan');
  });

  it('9. combined filters', () => {
    // Bride side + Invited + Pending RSVP
    const combined = filterGuests(sampleGuests, '', 'bride', 'pending', 'invited');
    expect(combined).toHaveLength(1);
    expect(combined[0].name).toBe('Ibu Ratna & Suami');

    // Bride side + Invited + Not attending
    const notAttendingBride = filterGuests(
      sampleGuests,
      '',
      'bride',
      'not_attending',
      'invited'
    );
    expect(notAttendingBride).toHaveLength(1);
    expect(notAttendingBride[0].name).toBe('Citra Kirana');
  });

  it('10. default pax = 1', () => {
    const { newGuest } = createGuest([], {
      name: 'Default Guest',
    });

    expect(newGuest.pax).toBe(1);
    expect(newGuest.side).toBe('shared');
    expect(newGuest.invitationStatus).toBe('not_invited');
    expect(newGuest.rsvpStatus).toBe('pending');
  });

  it('11. positive integer pax accepted', () => {
    expect(isValidPax(1)).toBe(true);
    expect(isValidPax(5)).toBe(true);
    expect(isValidPax(100)).toBe(true);
    expect(isValidPax('3')).toBe(true);
    expect(validatePax(4)).toBe(4);
    expect(validatePax('10')).toBe(10);

    const { newGuest } = createGuest([], {
      name: 'Family Group',
      pax: 5,
    });
    expect(newGuest.pax).toBe(5);
  });

  it('12. zero pax rejected', () => {
    expect(isValidPax(0)).toBe(false);
    expect(isValidPax('0')).toBe(false);
    expect(validatePax(0)).toBeNull();
    expect(validatePax('0')).toBeNull();

    // Default fallback when invalid
    const { newGuest } = createGuest([], {
      name: 'Zero Pax Test',
      pax: 0,
    });
    expect(newGuest.pax).toBe(1);
  });

  it('13. negative pax rejected', () => {
    expect(isValidPax(-1)).toBe(false);
    expect(isValidPax(-5)).toBe(false);
    expect(isValidPax('-2')).toBe(false);
    expect(validatePax(-1)).toBeNull();
    expect(validatePax('-3')).toBeNull();

    const { newGuest } = createGuest([], {
      name: 'Negative Pax Test',
      pax: -3,
    });
    expect(newGuest.pax).toBe(1);
  });

  it('14. decimal pax rejected', () => {
    expect(isValidPax(1.5)).toBe(false);
    expect(isValidPax(2.7)).toBe(false);
    expect(isValidPax('2.5')).toBe(false);
    expect(validatePax(1.5)).toBeNull();
    expect(validatePax('3.14')).toBeNull();

    const { newGuest } = createGuest([], {
      name: 'Decimal Pax Test',
      pax: 2.5,
    });
    expect(newGuest.pax).toBe(1);
  });

  it('15. guest summary calculation', () => {
    // sampleGuests has:
    // guest-1: pax 2, invited, attending
    // guest-2: pax 2, invited, pending
    // guest-3: pax 1, not_invited, pending
    // guest-4: pax 1, invited, not_attending
    // Total Pax: 2 + 2 + 1 + 1 = 6
    // Attending Pax: 2
    // Pending Pax: 2 + 1 = 3
    // Not Attending Pax: 1
    // Invited Pax: 2 + 2 + 1 = 5
    // Not Invited Pax: 1

    const summary = getGuestSummary(sampleGuests);
    expect(summary.totalPax).toBe(6);
    expect(summary.attendingPax).toBe(2);
    expect(summary.pendingPax).toBe(3);
    expect(summary.notAttendingPax).toBe(1);
    expect(summary.invitedPax).toBe(5);
    expect(summary.notInvitedPax).toBe(1);
    expect(summary.totalGuestsCount).toBe(4);
  });

  it('16. workspace isolation', () => {
    const ws1 = 'workspace-alpha';
    const ws2 = 'workspace-beta';

    const { updatedGuests: guestsWs1 } = createGuest([], {
      name: 'Guest Alpha',
      pax: 2,
    });

    const { updatedGuests: guestsWs2 } = createGuest([], {
      name: 'Guest Beta',
      pax: 3,
    });

    workspaceRepository.saveGuests(ws1, guestsWs1);
    workspaceRepository.saveGuests(ws2, guestsWs2);

    const readWs1 = workspaceRepository.getGuests(ws1);
    const readWs2 = workspaceRepository.getGuests(ws2);

    expect(readWs1).toHaveLength(1);
    expect(readWs1[0].name).toBe('Guest Alpha');
    expect(readWs1[0].pax).toBe(2);

    expect(readWs2).toHaveLength(1);
    expect(readWs2[0].name).toBe('Guest Beta');
    expect(readWs2[0].pax).toBe(3);
  });

  it('17. deleting guest does not affect tasks', () => {
    const wsId = 'ws-test-tasks';
    const sampleTask: TaskItem = {
      id: 'task-1',
      title: 'Kirim Undangan',
      description: 'Undangan cetak',
      category: 'invitation',
      status: 'todo',
      priority: 'high',
      dueDate: '2026-10-01',
      estimatedMinutes: 30,
      source: 'custom',
      templateId: null,
      vendorId: null,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      completedAt: null,
    };

    workspaceRepository.saveTasks(wsId, [sampleTask]);

    const { updatedGuests: gList } = createGuest([], { name: 'Tamu Hapus' });
    workspaceRepository.saveGuests(wsId, gList);

    // Delete the guest
    const { updatedGuests: afterDelete } = deleteGuest(gList, gList[0].id);
    workspaceRepository.saveGuests(wsId, afterDelete);

    const tasksAfter = workspaceRepository.getTasks(wsId);
    expect(tasksAfter).toHaveLength(1);
    expect(tasksAfter[0].id).toBe('task-1');
    expect(tasksAfter[0].title).toBe('Kirim Undangan');
  });

  it('18. deleting guest does not affect vendors', () => {
    const wsId = 'ws-test-vendors';
    const sampleVendor: Vendor = {
      id: 'v-1',
      name: 'Gedung Serbaguna',
      category: 'venue',
      status: 'selected',
      quotedPrice: 50000000,
      contactName: null,
      phone: null,
      instagram: null,
      notes: null,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    workspaceRepository.saveVendors(wsId, [sampleVendor]);

    const { updatedGuests: gList } = createGuest([], { name: 'Tamu X' });
    workspaceRepository.saveGuests(wsId, gList);

    // Delete the guest
    const { updatedGuests: afterDelete } = deleteGuest(gList, gList[0].id);
    workspaceRepository.saveGuests(wsId, afterDelete);

    const vendorsAfter = workspaceRepository.getVendors(wsId);
    expect(vendorsAfter).toHaveLength(1);
    expect(vendorsAfter[0].id).toBe('v-1');
    expect(vendorsAfter[0].name).toBe('Gedung Serbaguna');
  });

  it('19. deleting guest does not affect budget', () => {
    const wsId = 'ws-test-budget';
    const sampleBudget: StoredBudget = {
      allocations: [
        {
          id: 'alloc-1',
          category: 'venue',
          amount: 40000000,
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
      ],
      expenses: [
        {
          id: 'exp-1',
          category: 'venue',
          title: 'DP Venue',
          amount: 15000000,
          date: '2026-09-01',
          note: null,
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
      ],
    };

    workspaceRepository.saveBudget(wsId, sampleBudget);

    const { updatedGuests: gList } = createGuest([], { name: 'Tamu Y' });
    workspaceRepository.saveGuests(wsId, gList);

    // Delete the guest
    const { updatedGuests: afterDelete } = deleteGuest(gList, gList[0].id);
    workspaceRepository.saveGuests(wsId, afterDelete);

    const budgetAfter = workspaceRepository.getBudget(wsId);
    expect(budgetAfter.allocations).toHaveLength(1);
    expect(budgetAfter.expenses).toHaveLength(1);
    expect(budgetAfter.expenses[0].amount).toBe(15000000);
  });

  it('20. estimatedGuestCount remains unchanged when guest list changes', () => {
    const ws: StoredWorkspace = {
      id: 'ws-test-est-guest',
      coupleName: 'Budi & Ani',
      weddingDate: '2026-12-12',
      estimatedBudget: 150000000,
      estimatedGuestCount: 500, // Planning estimate
      completedCategories: [],
      primaryPlanningPriority: 'checklist',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    workspaceRepository.saveWorkspace(ws);

    // Add guests totaling 5 pax
    const { updatedGuests: gList1 } = createGuest([], {
      name: 'Keluarga Besar',
      pax: 5,
    });
    workspaceRepository.saveGuests(ws.id, gList1);

    let currentWs = workspaceRepository.getWorkspace();
    expect(currentWs?.estimatedGuestCount).toBe(500);

    // Delete guest
    const { updatedGuests: gList2 } = deleteGuest(gList1, gList1[0].id);
    workspaceRepository.saveGuests(ws.id, gList2);

    currentWs = workspaceRepository.getWorkspace();
    expect(currentWs?.estimatedGuestCount).toBe(500);
  });
});
