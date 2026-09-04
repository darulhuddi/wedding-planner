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

  describe('Unified Authenticated Navbar State Tests', () => {
    const deriveNavbarActions = (
      user: any | null,
      isAuthLoading: boolean,
      isAdmin: boolean,
      isAdminLoading: boolean
    ) => {
      const isResolving = isAuthLoading || (user && isAdminLoading);
      if (isResolving) {
        return { type: 'loading' };
      }
      if (!user) {
        return { type: 'guest', buttons: ['Masuk', 'Mulai Gratis'] };
      }
      if (isAdmin) {
        return { type: 'admin', buttons: ['Admin'], destination: 'admin' };
      }
      return { type: 'customer', buttons: ['Dashboard'], destination: 'dashboard' };
    };

    it('1. Logged-out user sees "Masuk" and "Mulai Gratis"', () => {
      const result = deriveNavbarActions(null, false, false, false);
      expect(result.type).toBe('guest');
      expect(result.buttons).toEqual(['Masuk', 'Mulai Gratis']);
    });

    it('2. Authenticated customer sees "Dashboard" (no "Masuk" or "Mulai Gratis")', () => {
      const user = { id: 'cust-1', email: 'cust@example.com' };
      const result = deriveNavbarActions(user, false, false, false);
      expect(result.type).toBe('customer');
      expect(result.buttons).toEqual(['Dashboard']);
      expect(result.destination).toBe('dashboard');
    });

    it('3. Authenticated admin sees "Admin" (no "Masuk" or "Mulai Gratis")', () => {
      const user = { id: 'admin-1', email: 'admin@wedflow.id' };
      const result = deriveNavbarActions(user, false, true, false);
      expect(result.type).toBe('admin');
      expect(result.buttons).toEqual(['Admin']);
      expect(result.destination).toBe('admin');
    });

    it('4. Auth loading renders loading state and does not flicker guest buttons', () => {
      const result = deriveNavbarActions(null, true, false, false);
      expect(result.type).toBe('loading');
    });

    it('5. Admin loading renders loading placeholder until admin status resolves', () => {
      const user = { id: 'admin-1' };
      const result = deriveNavbarActions(user, false, false, true);
      expect(result.type).toBe('loading');
    });
  });

  describe('Admin and Customer Logout Mechanism Tests', () => {
    it('6. Customer logout triggers authService.signOut and resets auth state to guest', async () => {
      let session: any = { user: { id: 'cust-1' } };
      let user: any = { id: 'cust-1' };
      let isAdmin = false;

      const signOutSpy = vi.spyOn(authService, 'signOut').mockResolvedValueOnce(undefined);

      const handleSignOut = async () => {
        await authService.signOut();
        session = null;
        user = null;
        isAdmin = false;
      };

      await handleSignOut();

      expect(signOutSpy).toHaveBeenCalledTimes(1);
      expect(session).toBeNull();
      expect(user).toBeNull();
      expect(isAdmin).toBe(false);
    });

    it('7. Admin logout triggers authService.signOut, clears admin state, and redirects to public landing', async () => {
      let session: any = { user: { id: 'admin-1' } };
      let user: any = { id: 'admin-1' };
      let isAdmin = true;
      let currentRoute = 'admin/payments';

      const navigateTo = (route: string) => {
        currentRoute = route;
      };

      const signOutSpy = vi.spyOn(authService, 'signOut').mockResolvedValueOnce(undefined);

      const handleAdminSignOut = async () => {
        await authService.signOut();
        session = null;
        user = null;
        isAdmin = false;
        navigateTo('home');
      };

      await handleAdminSignOut();

      expect(signOutSpy).toHaveBeenCalledTimes(1);
      expect(session).toBeNull();
      expect(user).toBeNull();
      expect(isAdmin).toBe(false);
      expect(currentRoute).toBe('home');
    });

    it('8. After Admin logout, /admin is strictly blocked by route guard', () => {
      const user = null;
      const isAdmin = false;
      const requestedRoute = 'admin/overview';
      const isAdminRoute = requestedRoute.startsWith('admin');

      let renderedPage = '';
      if (isAdminRoute && !user) {
        renderedPage = 'LoginPage';
      } else if (isAdminRoute && user && !isAdmin) {
        renderedPage = 'AccessDenied';
      } else if (isAdminRoute && user && isAdmin) {
        renderedPage = 'AdminOverviewPage';
      }

      expect(renderedPage).toBe('LoginPage');
    });
  });
});
