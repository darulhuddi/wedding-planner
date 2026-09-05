import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../lib/supabaseClient';
import * as workspaceRepository from './workspaceRepository';

if (typeof localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    _data: {} as Record<string, string>,
    getItem(key: string) {
      return this._data[key] ?? null;
    },
    setItem(key: string, val: string) {
      this._data[key] = String(val);
    },
    removeItem(key: string) {
      delete this._data[key];
    },
    clear() {
      this._data = {};
    },
  };
}

describe('workspaceRepository.resetPlanningData Test Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('invokes supabase.rpc with reset_user_wedding_planning and clears planning localStorage', async () => {
    // Seed planning localStorage keys
    localStorage.setItem('wedflow_workspace_v2', JSON.stringify({ id: 'ws-123' }));
    localStorage.setItem('wedflow_tasks', JSON.stringify({ 'ws-123': [{ id: 'task-1' }] }));
    localStorage.setItem('wedflow_budgets', JSON.stringify({ 'ws-123': { allocations: [], expenses: [] } }));
    localStorage.setItem('wedflow_vendors', JSON.stringify({ 'ws-123': [] }));
    localStorage.setItem('wedflow_guests', JSON.stringify({ 'ws-123': [] }));
    localStorage.setItem('wedflow_notes', JSON.stringify({ 'ws-123': [] }));
    localStorage.setItem('wedflow_onboarding_draft', JSON.stringify({ coupleName: 'Draft Couple' }));
    // Seed auth token that must NOT be removed
    localStorage.setItem('sb-testproject-auth-token', 'mock-session-token');

    // Mock RPC success
    const rpcSpy = vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
      data: {
        success: true,
        workspace_id: 'ws-123',
        message: 'Seluruh data perencanaan pernikahan berhasil di-reset ke kondisi awal.',
      },
      error: null,
    } as any);

    const result = await workspaceRepository.resetPlanningData();

    expect(rpcSpy).toHaveBeenCalledWith('reset_user_wedding_planning');
    expect(result.success).toBe(true);

    // Verify planning keys are removed
    expect(localStorage.getItem('wedflow_workspace_v2')).toBeNull();
    expect(localStorage.getItem('wedflow_tasks')).toBeNull();
    expect(localStorage.getItem('wedflow_budgets')).toBeNull();
    expect(localStorage.getItem('wedflow_vendors')).toBeNull();
    expect(localStorage.getItem('wedflow_guests')).toBeNull();
    expect(localStorage.getItem('wedflow_notes')).toBeNull();
    expect(localStorage.getItem('wedflow_onboarding_draft')).toBeNull();

    // Verify auth token remains completely intact
    expect(localStorage.getItem('sb-testproject-auth-token')).toBe('mock-session-token');
  });

  it('does NOT clear localStorage if Supabase RPC fails with error', async () => {
    localStorage.setItem('wedflow_workspace_v2', JSON.stringify({ id: 'ws-123' }));
    localStorage.setItem('wedflow_tasks', JSON.stringify({ 'ws-123': [{ id: 'task-1' }] }));

    // Mock RPC failure
    vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
      data: null,
      error: { message: 'Akses ditolak: Pengguna belum terotentikasi.', code: '42501' },
    } as any);

    await expect(workspaceRepository.resetPlanningData()).rejects.toThrow(
      'Akses ditolak: Pengguna belum terotentikasi.'
    );

    // Verify planning keys were NOT wiped on error
    expect(localStorage.getItem('wedflow_workspace_v2')).not.toBeNull();
    expect(localStorage.getItem('wedflow_tasks')).not.toBeNull();
  });
});
