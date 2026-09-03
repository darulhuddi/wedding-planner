import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../lib/supabaseClient';
import { authService, getCurrentSession, signUp, signIn, signOut } from './authService';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCurrentSession', () => {
    it('returns session when successful', async () => {
      const mockSession = { access_token: 'xyz', user: { id: 'user-1' } };
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: mockSession as any },
        error: null,
      });

      const session = await getCurrentSession();
      expect(session).toEqual(mockSession);
      expect(supabase.auth.getSession).toHaveBeenCalledTimes(1);
    });

    it('throws error when getSession fails', async () => {
      const mockError = new Error('Session error');
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: mockError as any,
      });

      await expect(getCurrentSession()).rejects.toThrow('Session error');
    });
  });

  describe('signUp', () => {
    it('calls supabase.auth.signUp and returns data', async () => {
      const mockData = { user: { id: 'user-1', email: 'test@example.com' }, session: null };
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: mockData as any,
        error: null,
      });

      const result = await signUp('test@example.com', 'password123');
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result).toEqual(mockData);
    });

    it('throws error when signUp fails', async () => {
      const mockError = new Error('Sign up failed');
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: mockError as any,
      });

      await expect(signUp('test@example.com', 'password123')).rejects.toThrow('Sign up failed');
    });
  });

  describe('signIn', () => {
    it('calls supabase.auth.signInWithPassword and returns data', async () => {
      const mockData = { user: { id: 'user-1' }, session: { access_token: 'token' } };
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: mockData as any,
        error: null,
      });

      const result = await signIn('test@example.com', 'password123');
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result).toEqual(mockData);
    });

    it('throws error when signIn fails', async () => {
      const mockError = new Error('Invalid credentials');
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: mockError as any,
      });

      await expect(signIn('test@example.com', 'wrongpass')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('signOut', () => {
    it('calls supabase.auth.signOut successfully', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({
        error: null,
      });

      await expect(signOut()).resolves.toBeUndefined();
      expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
    });

    it('throws error when signOut fails', async () => {
      const mockError = new Error('Sign out failed');
      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({
        error: mockError as any,
      });

      await expect(signOut()).rejects.toThrow('Sign out failed');
    });
  });

  describe('authService object exports', () => {
    it('exposes all auth methods', () => {
      expect(authService.getCurrentSession).toBe(getCurrentSession);
      expect(authService.signUp).toBe(signUp);
      expect(authService.signIn).toBe(signIn);
      expect(authService.signOut).toBe(signOut);
    });
  });
});
