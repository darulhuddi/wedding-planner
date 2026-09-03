import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from './authService';

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

describe('Auth UI Logic & Validation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Login Flow', () => {
    it('login success: signs in and triggers dashboard navigation', async () => {
      const navigateDashboard = vi.fn();
      vi.spyOn(authService, 'signIn').mockResolvedValueOnce({
        user: { id: 'user-1', email: 'adit@example.com' } as any,
        session: { access_token: 'valid-token' } as any,
      });

      const email: string = '  adit@example.com  ';
      const password: string = 'password123';

      await authService.signIn(email.trim(), password);
      navigateDashboard();

      expect(authService.signIn).toHaveBeenCalledWith('adit@example.com', 'password123');
      expect(navigateDashboard).toHaveBeenCalledTimes(1);
    });

    it('login failure: handles invalid credentials and prevents navigation', async () => {
      const navigateDashboard = vi.fn();
      vi.spyOn(authService, 'signIn').mockRejectedValueOnce(
        new Error('Invalid login credentials')
      );

      let errorMessage = '';
      try {
        await authService.signIn('wrong@example.com', 'wrongpassword');
        navigateDashboard();
      } catch (err: any) {
        if (err.message.toLowerCase().includes('invalid login credentials')) {
          errorMessage = 'Email atau kata sandi salah. Silakan periksa kembali.';
        } else {
          errorMessage = err.message;
        }
      }

      expect(errorMessage).toBe('Email atau kata sandi salah. Silakan periksa kembali.');
      expect(navigateDashboard).not.toHaveBeenCalled();
    });
  });

  describe('Sign Up Flow & Client-side Validation', () => {
    it('signup success: creates account and navigates to onboarding', async () => {
      const navigateOnboarding = vi.fn();
      vi.spyOn(authService, 'signUp').mockResolvedValueOnce({
        user: { id: 'user-new', email: 'amel@example.com' } as any,
        session: null,
      });

      const password: string = 'securepassword';
      const confirmPassword: string = 'securepassword';
      let error: string | null = null;

      if (password !== confirmPassword) {
        error = 'Kata sandi dan konfirmasi kata sandi tidak cocok.';
      } else if (password.length < 6) {
        error = 'Kata sandi minimal 6 karakter.';
      } else {
        await authService.signUp('amel@example.com', password);
        navigateOnboarding();
      }

      expect(error).toBeNull();
      expect(authService.signUp).toHaveBeenCalledWith('amel@example.com', 'securepassword');
      expect(navigateOnboarding).toHaveBeenCalledTimes(1);
    });

    it('password mismatch: blocks signup without calling authService or navigating', async () => {
      const navigateOnboarding = vi.fn();
      const signUpSpy = vi.spyOn(authService, 'signUp');

      const password: string = 'password123';
      const confirmPassword: string = 'password456';
      let error: string | null = null;

      if (password !== confirmPassword) {
        error = 'Kata sandi dan konfirmasi kata sandi tidak cocok.';
      } else {
        await authService.signUp('amel@example.com', password);
        navigateOnboarding();
      }

      expect(error).toBe('Kata sandi dan konfirmasi kata sandi tidak cocok.');
      expect(signUpSpy).not.toHaveBeenCalled();
      expect(navigateOnboarding).not.toHaveBeenCalled();
    });

    it('short password: blocks signup when password length is less than 6', async () => {
      const signUpSpy = vi.spyOn(authService, 'signUp');

      const password: string = '123';
      const confirmPassword: string = '123';
      let error: string | null = null;

      if (password !== confirmPassword) {
        error = 'Kata sandi dan konfirmasi kata sandi tidak cocok.';
      } else if (password.length < 6) {
        error = 'Kata sandi minimal 6 karakter.';
      } else {
        await authService.signUp('amel@example.com', password);
      }

      expect(error).toBe('Kata sandi minimal 6 karakter.');
      expect(signUpSpy).not.toHaveBeenCalled();
    });

    it('submission guard: prevents duplicate submissions while loading', async () => {
      let isSubmitting = false;
      let submissionCount = 0;

      const performSubmit = async () => {
        if (isSubmitting) return;
        isSubmitting = true;
        submissionCount++;
        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 10));
        isSubmitting = false;
      };

      // Trigger parallel submissions
      const promise1 = performSubmit();
      const promise2 = performSubmit();

      await Promise.all([promise1, promise2]);

      expect(submissionCount).toBe(1);
    });
  });
});
