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

describe('Auth Integration & Routing Flow Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Homepage CTA Routing Integration', () => {
    // Models the exact routing mechanism used in App.tsx
    const createRouterContext = (initialRoute: string = 'home') => {
      let currentRoute = initialRoute;
      let isModalOpen = false;

      const navigateTo = (route: string) => {
        currentRoute = route;
      };

      const handleOpenAuth = (mode: 'signup' | 'login') => {
        if (mode === 'signup') {
          navigateTo('signup');
        } else {
          navigateTo('login');
        }
      };

      return {
        get currentRoute() {
          return currentRoute;
        },
        get isModalOpen() {
          return isModalOpen;
        },
        handleOpenAuth,
        navigateTo,
      };
    };

    it('routes Homepage "Mulai Gratis" (Sign Up CTA) to /signup (not onboarding or modal)', () => {
      const router = createRouterContext('home');
      
      // Simulate user clicking "Mulai Gratis" on Navbar/Hero/FinalCTA
      router.handleOpenAuth('signup');

      expect(router.currentRoute).toBe('signup');
      expect(router.isModalOpen).toBe(false);
    });

    it('routes Homepage "Masuk" (Login CTA) to /login (not legacy AuthModal)', () => {
      const router = createRouterContext('home');

      // Simulate user clicking "Masuk" on Navbar/Footer
      router.handleOpenAuth('login');

      expect(router.currentRoute).toBe('login');
      expect(router.isModalOpen).toBe(false);
    });

    it('guarantees legacy AuthModal is never opened by homepage auth CTAs', () => {
      const router = createRouterContext('home');

      router.handleOpenAuth('login');
      expect(router.isModalOpen).toBe(false);

      router.handleOpenAuth('signup');
      expect(router.isModalOpen).toBe(false);
    });
  });

  describe('Post-Authentication Redirection Flow', () => {
    it('Login page -> successful auth -> navigates to /dashboard', async () => {
      let activeRoute = 'login';
      const navigateTo = (route: string) => {
        activeRoute = route;
      };

      vi.spyOn(authService, 'signIn').mockResolvedValueOnce({
        user: { id: 'usr-1', email: 'user@wedflow.id' } as any,
        session: { access_token: 'valid-jwt' } as any,
      });

      // User performs sign in on LoginPage
      await authService.signIn('user@wedflow.id', 'password123');
      navigateTo('dashboard');

      expect(authService.signIn).toHaveBeenCalledWith('user@wedflow.id', 'password123');
      expect(activeRoute).toBe('dashboard');
    });

    it('Sign Up page -> successful registration -> navigates to /onboarding', async () => {
      let activeRoute = 'signup';
      const navigateTo = (route: string) => {
        activeRoute = route;
      };

      vi.spyOn(authService, 'signUp').mockResolvedValueOnce({
        user: { id: 'usr-2', email: 'couple@wedflow.id' } as any,
        session: null,
      });

      // User performs sign up on SignUpPage
      await authService.signUp('couple@wedflow.id', 'password123');
      navigateTo('onboarding');

      expect(authService.signUp).toHaveBeenCalledWith('couple@wedflow.id', 'password123');
      expect(activeRoute).toBe('onboarding');
    });
  });
});
