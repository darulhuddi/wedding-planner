/**
 * WedFlow Vendor Utilities
 *
 * Pure domain utilities for Vendor operations, filtering, summary statistics,
 * and task disassociation.
 *
 * Rules:
 * - No side effects or direct storage calls here.
 * - Deleting a vendor disassociates vendorId on related canonical TaskItems (sets to null),
 *   never deleting the TaskItems themselves.
 * - Derived statistics (counts, summaries, filtered arrays) are computed at runtime.
 */

import { Vendor, VendorStatus } from '../types/vendor';
import { CategoryId } from '../types/onboarding';
import { TaskItem } from '../types/checklist';

export interface CreateVendorInput {
  name: string;
  category: CategoryId;
  status?: VendorStatus;
  quotedPrice?: number | null;
  contactName?: string | null;
  phone?: string | null;
  instagram?: string | null;
  notes?: string | null;
}

/**
  * Creates a new Vendor and appends it to the vendor array.
  */
export function createVendor(
  vendors: Vendor[],
  input: CreateVendorInput
): { updatedVendors: Vendor[]; newVendor: Vendor } {
  const now = new Date().toISOString();
  const newVendor: Vendor = {
    id: `vendor-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: input.name.trim(),
    category: input.category,
    status: input.status || 'considering',
    quotedPrice: input.quotedPrice !== undefined ? input.quotedPrice : null,
    contactName: input.contactName?.trim() || null,
    phone: input.phone?.trim() || null,
    instagram: input.instagram?.trim() || null,
    notes: input.notes?.trim() || null,
    createdAt: now,
    updatedAt: now,
  };

  return {
    updatedVendors: [newVendor, ...vendors],
    newVendor,
  };
}

/**
 * Updates an existing vendor by ID.
 * Returns a new array with updated vendor data.
 */
export function updateVendor(
  vendors: Vendor[],
  id: string,
  changes: Partial<Omit<Vendor, 'id' | 'createdAt'>>
): Vendor[] {
  const now = new Date().toISOString();
  return vendors.map((v) => {
    if (v.id !== id) return v;

    return {
      ...v,
      ...changes,
      name: changes.name !== undefined ? changes.name.trim() : v.name,
      contactName:
        changes.contactName !== undefined
          ? changes.contactName
            ? changes.contactName.trim()
            : null
          : v.contactName,
      phone: changes.phone !== undefined ? (changes.phone ? changes.phone.trim() : null) : v.phone,
      instagram:
        changes.instagram !== undefined
          ? changes.instagram
            ? changes.instagram.trim()
            : null
          : v.instagram,
      notes: changes.notes !== undefined ? (changes.notes ? changes.notes.trim() : null) : v.notes,
      updatedAt: now,
    };
  });
}

/**
 * Deletes a vendor by ID and disassociates vendorId on canonical tasks.
 * Sets task.vendorId = null for tasks referencing this vendor, leaving all other task properties intact.
 */
export function deleteVendor(
  vendors: Vendor[],
  vendorId: string,
  tasks?: TaskItem[]
): { updatedVendors: Vendor[]; updatedTasks?: TaskItem[] } {
  const updatedVendors = vendors.filter((v) => v.id !== vendorId);

  let updatedTasks: TaskItem[] | undefined = undefined;
  if (tasks) {
    updatedTasks = tasks.map((t) => {
      if (t.vendorId === vendorId) {
        return {
          ...t,
          vendorId: null,
          updatedAt: new Date().toISOString(),
        };
      }
      return t;
    });
  }

  return {
    updatedVendors,
    updatedTasks,
  };
}

/**
 * Retrieves a single vendor by ID.
 */
export function getVendor(vendors: Vendor[], id: string): Vendor | undefined {
  return vendors.find((v) => v.id === id);
}

/**
 * Filters vendors by search query (vendor name & contact name), status, and category.
 */
export function filterVendors(
  vendors: Vendor[],
  query: string,
  statusFilter: VendorStatus | 'all',
  categoryFilter: CategoryId | 'all'
): Vendor[] {
  const q = query.trim().toLowerCase();

  return vendors.filter((vendor) => {
    // Status Filter
    if (statusFilter !== 'all' && vendor.status !== statusFilter) {
      return false;
    }

    // Category Filter
    if (categoryFilter !== 'all' && vendor.category !== categoryFilter) {
      return false;
    }

    // Search Query (name or contactName)
    if (q) {
      const matchName = vendor.name.toLowerCase().includes(q);
      const matchContact = vendor.contactName ? vendor.contactName.toLowerCase().includes(q) : false;
      if (!matchName && !matchContact) {
        return false;
      }
    }

    return true;
  });
}

export interface VendorSummary {
  total: number;
  selected: number;
  considering: number;
  contacted: number;
  negotiating: number;
  notSelected: number;
}

/**
 * Derives runtime compact summary counts from vendor array.
 */
export function getVendorSummary(vendors: Vendor[]): VendorSummary {
  let selected = 0;
  let considering = 0;
  let contacted = 0;
  let negotiating = 0;
  let notSelected = 0;

  for (const v of vendors) {
    if (v.status === 'selected') selected++;
    else if (v.status === 'considering') considering++;
    else if (v.status === 'contacted') contacted++;
    else if (v.status === 'negotiating') negotiating++;
    else if (v.status === 'not_selected') notSelected++;
  }

  return {
    total: vendors.length,
    selected,
    considering,
    contacted,
    negotiating,
    notSelected,
  };
}

/**
 * Derived selector for tasks related to a specific vendor ID.
 */
export function getTasksByVendor(tasks: TaskItem[], vendorId: string): TaskItem[] {
  if (!vendorId) return [];
  return tasks.filter((t) => t.vendorId === vendorId);
}
