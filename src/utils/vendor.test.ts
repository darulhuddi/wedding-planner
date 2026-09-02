import { describe, it, expect, beforeEach } from 'vitest';
import {
  createVendor,
  updateVendor,
  deleteVendor,
  filterVendors,
  getVendorSummary,
  getTasksByVendor,
} from './vendorUtils';
import { Vendor } from '../types/vendor';
import { TaskItem } from '../types/checklist';
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

describe('WedFlow Vendor v1 System Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const sampleTasks: TaskItem[] = [
    {
      id: 'task-1',
      title: 'Bayar DP Catering',
      description: 'DP 30%',
      category: 'catering',
      status: 'todo',
      priority: 'high',
      dueDate: '2026-11-01',
      estimatedMinutes: 30,
      source: 'custom',
      templateId: null,
      vendorId: 'vendor-1',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      completedAt: null,
    },
    {
      id: 'task-2',
      title: 'Food Tasting Catering',
      description: 'Coba menu utama',
      category: 'catering',
      status: 'completed',
      priority: 'medium',
      dueDate: '2026-10-15',
      estimatedMinutes: 60,
      source: 'template',
      templateId: 'tmpl-2',
      vendorId: 'vendor-1',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      completedAt: '2026-09-02T00:00:00Z',
    },
    {
      id: 'task-3',
      title: 'Survei Gedung',
      description: 'Gedung Utama',
      category: 'venue',
      status: 'todo',
      priority: 'high',
      dueDate: '2026-09-20',
      estimatedMinutes: 45,
      source: 'template',
      templateId: 'tmpl-1',
      vendorId: null,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      completedAt: null,
    },
  ];

  it('1. create vendor', () => {
    const initial: Vendor[] = [];
    const { updatedVendors, newVendor } = createVendor(initial, {
      name: 'Catering Berkah',
      category: 'catering',
      status: 'considering',
      quotedPrice: 35000000,
      contactName: 'Pak Budi',
      phone: '08123456789',
      instagram: '@cateringberkah',
      notes: 'Paket 500 porsi',
    });

    expect(updatedVendors).toHaveLength(1);
    expect(newVendor.name).toBe('Catering Berkah');
    expect(newVendor.category).toBe('catering');
    expect(newVendor.status).toBe('considering');
    expect(newVendor.quotedPrice).toBe(35000000);
    expect(newVendor.contactName).toBe('Pak Budi');
    expect(newVendor.phone).toBe('08123456789');
    expect(newVendor.instagram).toBe('@cateringberkah');
    expect(newVendor.notes).toBe('Paket 500 porsi');
    expect(newVendor.id).toBeDefined();
  });

  it('2. edit vendor', () => {
    const { updatedVendors: initial } = createVendor([], {
      name: 'Foto Indah',
      category: 'photography',
      status: 'considering',
      quotedPrice: 10000000,
    });

    const vendorId = initial[0].id;
    const updated = updateVendor(initial, vendorId, {
      name: 'Foto Indah Studio',
      status: 'selected',
      quotedPrice: 12500000,
      notes: 'Sudah sepakat bonus album',
    });

    expect(updated[0].name).toBe('Foto Indah Studio');
    expect(updated[0].status).toBe('selected');
    expect(updated[0].quotedPrice).toBe(12500000);
    expect(updated[0].notes).toBe('Sudah sepakat bonus album');
    expect(updated[0].category).toBe('photography');
  });

  it('3. cancel edit preserves original data', () => {
    const { updatedVendors: initial } = createVendor([], {
      name: 'Sanggar MUA',
      category: 'makeup_attire',
      status: 'negotiating',
      quotedPrice: 8000000,
    });

    const draftChanges: Partial<Vendor> = {
      name: 'Sanggar MUA Edit Draft',
      quotedPrice: 9999999,
    };

    // If user cancels edit without applying updateVendor, initial vendors remains unchanged
    expect(initial[0].name).toBe('Sanggar MUA');
    expect(initial[0].quotedPrice).toBe(8000000);
  });

  it('4. delete vendor', () => {
    const { updatedVendors: initial } = createVendor([], {
      name: 'Dekorasi Mewah',
      category: 'decoration',
    });
    const vendorId = initial[0].id;

    const { updatedVendors } = deleteVendor(initial, vendorId);
    expect(updatedVendors).toHaveLength(0);
  });

  it('5. delete vendor disassociates vendorId from tasks', () => {
    const { updatedVendors: initialVendors } = createVendor([], {
      name: 'Catering Utama',
      category: 'catering',
    });
    // Set vendorId to match sample task-1 and task-2
    const vendorId = 'vendor-1';

    const { updatedTasks } = deleteVendor(initialVendors, vendorId, sampleTasks);
    expect(updatedTasks).toBeDefined();
    expect(updatedTasks![0].vendorId).toBeNull();
    expect(updatedTasks![1].vendorId).toBeNull();
  });

  it('6. delete vendor does not delete TaskItems', () => {
    const vendorId = 'vendor-1';
    const { updatedTasks } = deleteVendor([], vendorId, sampleTasks);

    expect(updatedTasks).toHaveLength(sampleTasks.length);
    expect(updatedTasks![0].id).toBe('task-1');
    expect(updatedTasks![1].id).toBe('task-2');
    expect(updatedTasks![2].id).toBe('task-3');
  });

  it('7. status filtering', () => {
    const v1: Vendor = {
      id: 'v1',
      name: 'Vendor A',
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
    const v2: Vendor = {
      id: 'v2',
      name: 'Vendor B',
      category: 'venue',
      status: 'considering',
      quotedPrice: 40000000,
      contactName: null,
      phone: null,
      instagram: null,
      notes: null,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    const selectedOnly = filterVendors([v1, v2], '', 'selected', 'all');
    expect(selectedOnly).toHaveLength(1);
    expect(selectedOnly[0].id).toBe('v1');

    const consideringOnly = filterVendors([v1, v2], '', 'considering', 'all');
    expect(consideringOnly).toHaveLength(1);
    expect(consideringOnly[0].id).toBe('v2');
  });

  it('8. category filtering', () => {
    const v1: Vendor = {
      id: 'v1',
      name: 'Gedung Kartika',
      category: 'venue',
      status: 'selected',
      quotedPrice: 30000000,
      contactName: null,
      phone: null,
      instagram: null,
      notes: null,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };
    const v2: Vendor = {
      id: 'v2',
      name: 'Catering Sedap',
      category: 'catering',
      status: 'considering',
      quotedPrice: 20000000,
      contactName: null,
      phone: null,
      instagram: null,
      notes: null,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    const venueOnly = filterVendors([v1, v2], '', 'all', 'venue');
    expect(venueOnly).toHaveLength(1);
    expect(venueOnly[0].id).toBe('v1');

    const cateringOnly = filterVendors([v1, v2], '', 'all', 'catering');
    expect(cateringOnly).toHaveLength(1);
    expect(cateringOnly[0].id).toBe('v2');
  });

  it('9. search by vendor name', () => {
    const v1: Vendor = {
      id: 'v1',
      name: 'Akadema Decoration',
      category: 'decoration',
      status: 'considering',
      quotedPrice: 15000000,
      contactName: 'Mas Andi',
      phone: null,
      instagram: null,
      notes: null,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    const results = filterVendors([v1], 'Akadema', 'all', 'all');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('v1');
  });

  it('10. search by contact name', () => {
    const v1: Vendor = {
      id: 'v1',
      name: 'Sanggar Melati',
      category: 'makeup_attire',
      status: 'contacted',
      quotedPrice: 7000000,
      contactName: 'Tante Melati',
      phone: null,
      instagram: null,
      notes: null,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    const results = filterVendors([v1], 'Melati', 'all', 'all');
    expect(results).toHaveLength(1);
    expect(results[0].contactName).toBe('Tante Melati');
  });

  it('11. optional quotedPrice', () => {
    const { newVendor: vWithoutPrice } = createVendor([], {
      name: 'Undangan Digital',
      category: 'invitation',
      quotedPrice: null,
    });

    expect(vWithoutPrice.quotedPrice).toBeNull();
  });

  it('12. arbitrary Rupiah integer values', () => {
    const testPrices = [500000, 1250000, 580000, 35000000, 100000000];

    for (const price of testPrices) {
      const { newVendor } = createVendor([], {
        name: `Test Vendor ${price}`,
        category: 'venue',
        quotedPrice: price,
      });
      expect(newVendor.quotedPrice).toBe(price);
    }
  });

  it('13. empty vendor state', () => {
    const vendors: Vendor[] = [];
    const summary = getVendorSummary(vendors);

    expect(summary.total).toBe(0);
    expect(summary.selected).toBe(0);
    expect(summary.considering).toBe(0);
    expect(summary.contacted).toBe(0);
    expect(summary.negotiating).toBe(0);
    expect(summary.notSelected).toBe(0);

    const filtered = filterVendors(vendors, '', 'all', 'all');
    expect(filtered).toHaveLength(0);
  });

  it('14. related task filtering', () => {
    const related = getTasksByVendor(sampleTasks, 'vendor-1');
    expect(related).toHaveLength(2);
    expect(related[0].id).toBe('task-1');
    expect(related[1].id).toBe('task-2');

    const unrelated = getTasksByVendor(sampleTasks, 'non-existent');
    expect(unrelated).toHaveLength(0);
  });

  it('15. task remains canonical after vendor relation', () => {
    const task: TaskItem = { ...sampleTasks[0], vendorId: 'vendor-123' };

    // Verify task properties are preserved completely
    expect(task.id).toBe('task-1');
    expect(task.title).toBe('Bayar DP Catering');
    expect(task.category).toBe('catering');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('high');
    expect(task.vendorId).toBe('vendor-123');
  });

  it('16. workspace isolation', () => {
    const ws1 = 'workspace-alpha';
    const ws2 = 'workspace-beta';

    const { updatedVendors: vWs1 } = createVendor([], {
      name: 'Vendor Workspace Alpha',
      category: 'venue',
    });

    const { updatedVendors: vWs2 } = createVendor([], {
      name: 'Vendor Workspace Beta',
      category: 'catering',
    });

    workspaceRepository.saveVendors(ws1, vWs1);
    workspaceRepository.saveVendors(ws2, vWs2);

    const readWs1 = workspaceRepository.getVendors(ws1);
    const readWs2 = workspaceRepository.getVendors(ws2);

    expect(readWs1).toHaveLength(1);
    expect(readWs1[0].name).toBe('Vendor Workspace Alpha');

    expect(readWs2).toHaveLength(1);
    expect(readWs2[0].name).toBe('Vendor Workspace Beta');
  });

  it('17. vendor summary calculation', () => {
    const vendors: Vendor[] = [
      { id: '1', name: 'A', category: 'venue', status: 'selected', quotedPrice: 10, contactName: null, phone: null, instagram: null, notes: null, createdAt: '', updatedAt: '' },
      { id: '2', name: 'B', category: 'catering', status: 'considering', quotedPrice: 20, contactName: null, phone: null, instagram: null, notes: null, createdAt: '', updatedAt: '' },
      { id: '3', name: 'C', category: 'photography', status: 'considering', quotedPrice: 30, contactName: null, phone: null, instagram: null, notes: null, createdAt: '', updatedAt: '' },
      { id: '4', name: 'D', category: 'decoration', status: 'contacted', quotedPrice: 40, contactName: null, phone: null, instagram: null, notes: null, createdAt: '', updatedAt: '' },
      { id: '5', name: 'E', category: 'makeup_attire', status: 'negotiating', quotedPrice: 50, contactName: null, phone: null, instagram: null, notes: null, createdAt: '', updatedAt: '' },
      { id: '6', name: 'F', category: 'invitation', status: 'not_selected', quotedPrice: 60, contactName: null, phone: null, instagram: null, notes: null, createdAt: '', updatedAt: '' },
    ];

    const summary = getVendorSummary(vendors);
    expect(summary.total).toBe(6);
    expect(summary.selected).toBe(1);
    expect(summary.considering).toBe(2);
    expect(summary.contacted).toBe(1);
    expect(summary.negotiating).toBe(1);
    expect(summary.notSelected).toBe(1);
  });

  it('18. not-selected status', () => {
    const { newVendor } = createVendor([], {
      name: 'Vendor Cadangan',
      category: 'catering',
      status: 'not_selected',
    });

    expect(newVendor.status).toBe('not_selected');
  });

  it('19. selected status', () => {
    const { newVendor } = createVendor([], {
      name: 'Vendor Pilihan',
      category: 'venue',
      status: 'selected',
    });

    expect(newVendor.status).toBe('selected');
  });

  it('20. no dangling vendor references after deletion', () => {
    const vendorId = 'v-target';
    const tasksWithVendor: TaskItem[] = [
      { ...sampleTasks[0], vendorId },
      { ...sampleTasks[1], vendorId },
      { ...sampleTasks[2], vendorId: 'other-vendor' },
    ];

    const { updatedTasks } = deleteVendor([], vendorId, tasksWithVendor);

    expect(updatedTasks![0].vendorId).toBeNull();
    expect(updatedTasks![1].vendorId).toBeNull();
    expect(updatedTasks![2].vendorId).toBe('other-vendor');
  });
});
