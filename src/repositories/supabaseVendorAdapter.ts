/**
 * WedFlow Supabase Vendor Adapter
 *
 * Direct interface to the Supabase `public.vendors` table.
 * Translates between frontend Vendor (camelCase) and PostgreSQL vendors (snake_case).
 */

import { supabase } from '../lib/supabaseClient';
import { Vendor, VendorStatus } from '../types/vendor';
import { CategoryId } from '../types/onboarding';

export interface SupabaseVendorRow {
  id: string;
  workspace_id: string;
  name: string;
  category: string;
  status: string;
  quoted_price: number | null;
  contact_name: string | null;
  phone: string | null;
  instagram: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function mapRowToVendor(row: SupabaseVendorRow): Vendor {
  return {
    id: row.id,
    name: row.name,
    category: row.category as CategoryId,
    status: row.status as VendorStatus,
    quotedPrice: row.quoted_price !== null && row.quoted_price !== undefined ? Number(row.quoted_price) : null,
    contactName: row.contact_name ?? null,
    phone: row.phone ?? null,
    instagram: row.instagram ?? null,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapVendorToRow(vendor: Vendor, workspaceId: string): SupabaseVendorRow {
  return {
    id: vendor.id,
    workspace_id: workspaceId,
    name: vendor.name,
    category: vendor.category,
    status: vendor.status,
    quoted_price: vendor.quotedPrice ?? null,
    contact_name: vendor.contactName ?? null,
    phone: vendor.phone ?? null,
    instagram: vendor.instagram ?? null,
    notes: vendor.notes ?? null,
    created_at: vendor.createdAt,
    updated_at: vendor.updatedAt,
  };
}

/**
 * Fetches all vendors for the given workspace, ordered by created_at.
 */
export async function fetchVendorsByWorkspaceId(workspaceId: string): Promise<Vendor[]> {
  if (!workspaceId) return [];

  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[WedFlow] Failed to fetch vendors from Supabase:', error);
    throw new Error(error.message || 'Gagal mengambil data vendor dari database.');
  }

  return (data || []).map(mapRowToVendor);
}

/**
 * Inserts a single vendor into Supabase.
 */
export async function insertVendor(
  workspaceId: string,
  vendor: Vendor
): Promise<Vendor> {
  if (!workspaceId) {
    throw new Error('Workspace ID diperlukan untuk membuat vendor.');
  }

  const row = mapVendorToRow(vendor, workspaceId);
  const { data, error } = await supabase
    .from('vendors')
    .insert(row)
    .select('*')
    .single();

  if (error) {
    console.error('[WedFlow] Failed to insert vendor into Supabase:', error);
    throw new Error(error.message || 'Gagal menyimpan vendor ke database.');
  }

  return mapRowToVendor(data);
}

/**
 * Updates an existing vendor in Supabase, scoped by workspace_id.
 */
export async function updateVendorInDb(
  workspaceId: string,
  vendor: Vendor
): Promise<Vendor> {
  if (!workspaceId) {
    throw new Error('Workspace ID diperlukan untuk memperbarui vendor.');
  }

  const row = mapVendorToRow(vendor, workspaceId);
  const { data, error } = await supabase
    .from('vendors')
    .update(row)
    .eq('id', vendor.id)
    .eq('workspace_id', workspaceId)
    .select('*')
    .single();

  if (error) {
    console.error('[WedFlow] Failed to update vendor in Supabase:', error);
    throw new Error(error.message || 'Gagal memperbarui vendor di database.');
  }

  return mapRowToVendor(data);
}

/**
 * Deletes a vendor from Supabase, scoped by workspace_id.
 * Also disassociates any tasks referencing this vendor (sets tasks.vendor_id = null).
 */
export async function deleteVendorFromDb(
  workspaceId: string,
  vendorId: string
): Promise<void> {
  if (!workspaceId) {
    throw new Error('Workspace ID diperlukan untuk menghapus vendor.');
  }

  // First disassociate any tasks referencing this vendor in Supabase
  const { error: disassociateError } = await supabase
    .from('tasks')
    .update({ vendor_id: null, updated_at: new Date().toISOString() })
    .eq('vendor_id', vendorId)
    .eq('workspace_id', workspaceId);

  if (disassociateError) {
    console.warn('[WedFlow] Failed to disassociate tasks before vendor deletion:', disassociateError);
  }

  const { error } = await supabase
    .from('vendors')
    .delete()
    .eq('id', vendorId)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('[WedFlow] Failed to delete vendor from Supabase:', error);
    throw new Error(error.message || 'Gagal menghapus vendor dari database.');
  }
}
