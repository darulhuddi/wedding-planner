/**
 * WedFlow Supabase Guest Adapter
 *
 * Direct interface to the Supabase `public.guests` table.
 * Translates between frontend Guest (camelCase) and PostgreSQL guests (snake_case).
 */

import { supabase } from '../lib/supabaseClient';
import {
  Guest,
  GuestSide,
  GuestInvitationStatus,
  GuestRsvpStatus,
} from '../types/guest';

export interface SupabaseGuestRow {
  id: string;
  workspace_id: string;
  name: string;
  side: string;
  invitation_status: string;
  rsvp_status: string;
  pax: number;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function mapRowToGuest(row: SupabaseGuestRow): Guest {
  return {
    id: row.id,
    name: row.name,
    side: row.side as GuestSide,
    invitationStatus: row.invitation_status as GuestInvitationStatus,
    rsvpStatus: row.rsvp_status as GuestRsvpStatus,
    pax: Number(row.pax),
    phone: row.phone ?? null,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapGuestToRow(guest: Guest, workspaceId: string): SupabaseGuestRow {
  return {
    id: guest.id,
    workspace_id: workspaceId,
    name: guest.name,
    side: guest.side,
    invitation_status: guest.invitationStatus,
    rsvp_status: guest.rsvpStatus,
    pax: guest.pax,
    phone: guest.phone ?? null,
    notes: guest.notes ?? null,
    created_at: guest.createdAt,
    updated_at: guest.updatedAt,
  };
}

/**
 * Fetches all guests for the given workspace, ordered by created_at.
 */
export async function fetchGuestsByWorkspaceId(workspaceId: string): Promise<Guest[]> {
  if (!workspaceId) return [];

  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[WedFlow] Failed to fetch guests from Supabase:', error);
    throw new Error(error.message || 'Gagal mengambil data tamu dari database.');
  }

  return (data || []).map(mapRowToGuest);
}

/**
 * Inserts a single guest into Supabase.
 */
export async function insertGuest(
  workspaceId: string,
  guest: Guest
): Promise<Guest> {
  if (!workspaceId) {
    throw new Error('Workspace ID diperlukan untuk menambah tamu.');
  }

  const row = mapGuestToRow(guest, workspaceId);
  const { data, error } = await supabase
    .from('guests')
    .insert(row)
    .select('*')
    .single();

  if (error) {
    console.error('[WedFlow] Failed to insert guest into Supabase:', error);
    throw new Error(error.message || 'Gagal menyimpan tamu ke database.');
  }

  return mapRowToGuest(data);
}

/**
 * Updates an existing guest in Supabase, scoped by workspace_id.
 */
export async function updateGuestInDb(
  workspaceId: string,
  guest: Guest
): Promise<Guest> {
  if (!workspaceId) {
    throw new Error('Workspace ID diperlukan untuk memperbarui tamu.');
  }

  const row = mapGuestToRow(guest, workspaceId);
  const { data, error } = await supabase
    .from('guests')
    .update(row)
    .eq('id', guest.id)
    .eq('workspace_id', workspaceId)
    .select('*')
    .single();

  if (error) {
    console.error('[WedFlow] Failed to update guest in Supabase:', error);
    throw new Error(error.message || 'Gagal memperbarui tamu di database.');
  }

  return mapRowToGuest(data);
}

/**
 * Deletes a guest from Supabase, scoped by workspace_id.
 */
export async function deleteGuestFromDb(
  workspaceId: string,
  guestId: string
): Promise<void> {
  if (!workspaceId) {
    throw new Error('Workspace ID diperlukan untuk menghapus tamu.');
  }

  const { error } = await supabase
    .from('guests')
    .delete()
    .eq('id', guestId)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('[WedFlow] Failed to delete guest from Supabase:', error);
    throw new Error(error.message || 'Gagal menghapus tamu dari database.');
  }
}
