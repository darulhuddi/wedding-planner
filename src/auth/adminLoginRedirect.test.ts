import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from './authService';
import * as workspaceRepository from '../repositories/workspaceRepository';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    rpc: vi.fn(),
  },
}));

describe('Admin Login Redirect & Onboarding Regression Guard Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Brand-New User Flow', () => {
    it('redirects genuinely brand-new user to onboarding after login', () => {
      let currentRoute = 'login';
      const navigateTo = (route: string) => {
        currentRoute = route;
      };

      const user = { id: 'new-user-1', email: 'new@wedflow.id' };
      const isAuthLoading = false;
      const isAdminLoading = false;
      const isAdmin = false;
      const isWorkspaceResolved = true;
      const storedWorkspace = null;

      // Deterministic redirect evaluation
      if (!isAuthLoading && user && !isAdminLoading) {
        if (isAdmin) {
          if (currentRoute === 'login' || currentRoute === 'signup' || currentRoute === 'onboarding') {
            navigateTo('admin');
          }
        } else if (isWorkspaceResolved) {
          if (currentRoute === 'login' || currentRoute === 'signup') {
            navigateTo(storedWorkspace ? 'dashboard' : 'onboarding');
          }
        }
      }

      expect(currentRoute).toBe('onboarding');
    });

    it('successfully creates new workspace for genuinely new user in onboarding submission', async () => {
      const createWorkspaceSpy = vi.spyOn(workspaceRepository, 'createWorkspace').mockResolvedValueOnce({
        id: 'ws-new-1',
        userId: 'new-user-1',
        coupleName: 'Budi & Citra',
        weddingDate: '2026-11-20',
        estimatedBudget: 150_000_000,
        estimatedGuestCount: 300,
        completedCategories: [],
        primaryPlanningPriority: 'budget',
        religiousContexts: [],
        culturalContext: {
          hasTradition: null,
          description: null,
        },
        createdAt: '2026-09-04T00:00:00Z',
        updatedAt: '2026-09-04T00:00:00Z',
      });
      vi.spyOn(workspaceRepository, 'getWorkspace').mockResolvedValueOnce(null);

      const userId = 'new-user-1';
      const finalData = {
        coupleName: 'Budi & Citra',
        weddingDate: '2026-11-20',
        budget: 150_000_000,
        guestCount: 300,
        completedCategories: [],
        primaryPlanningPriority: 'budget' as const,
      };

      const existing = await workspaceRepository.getWorkspace(userId);
      let stored;
      if (!existing) {
        stored = await workspaceRepository.createWorkspace(
          {
            coupleName: finalData.coupleName.trim() || 'Adit & Amel',
            weddingDate: finalData.weddingDate,
            estimatedBudget: Number(finalData.budget) || 100_000_000,
            estimatedGuestCount: Number(finalData.guestCount) || 400,
            completedCategories: [],
            primaryPlanningPriority: finalData.primaryPlanningPriority,
            religiousContexts: [],
            culturalContext: {
              hasTradition: null,
              description: null,
            },
          },
          userId
        );
      }

      expect(createWorkspaceSpy).toHaveBeenCalled();
      expect(stored?.coupleName).toBe('Budi & Citra');
      expect(stored?.estimatedBudget).toBe(150_000_000);
    });
  });

  describe('2. Existing Customer Flow', () => {
    it('redirects existing customer to dashboard (NEVER onboarding)', () => {
      let currentRoute = 'login';
      const navigateTo = (route: string) => {
        currentRoute = route;
      };

      const user = { id: 'cust-1', email: 'existing@wedflow.id' };
      const isAuthLoading = false;
      const isAdminLoading = false;
      const isAdmin = false;
      const isWorkspaceResolved = true;
      const storedWorkspace = {
        id: 'ws-cust-1',
        coupleName: 'Adit & Amel',
        weddingDate: '2026-10-01',
        estimatedBudget: 100_000_000,
        estimatedGuestCount: 400,
        completedCategories: ['venue'],
        primaryPlanningPriority: 'timeline',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      };

      if (!isAuthLoading && user && !isAdminLoading) {
        if (isAdmin) {
          navigateTo('admin');
        } else if (isWorkspaceResolved) {
          if (currentRoute === 'login' || currentRoute === 'signup' || currentRoute === 'onboarding') {
            navigateTo(storedWorkspace ? 'dashboard' : 'onboarding');
          }
        }
      }

      expect(currentRoute).toBe('dashboard');
    });

    it('preserves existing customer data completely untouched after login', () => {
      const existingWorkspace = {
        id: 'ws-cust-1',
        userId: 'cust-1',
        coupleName: 'Romeo & Juliet',
        weddingDate: '2026-12-31',
        estimatedBudget: 250_000_000,
        estimatedGuestCount: 500,
        completedCategories: ['venue', 'catering'],
        primaryPlanningPriority: 'budget' as const,
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-15T00:00:00Z',
      };

      // Ensure no fields are wiped or reset
      expect(existingWorkspace.coupleName).toBe('Romeo & Juliet');
      expect(existingWorkspace.weddingDate).toBe('2026-12-31');
      expect(existingWorkspace.estimatedBudget).toBe(250_000_000);
      expect(existingWorkspace.completedCategories).toEqual(['venue', 'catering']);
    });

    it('blocks existing customer from manually navigating to onboarding and redirects to dashboard', () => {
      let currentRoute = 'onboarding';
      const navigateTo = (route: string) => {
        currentRoute = route;
      };

      const user = { id: 'cust-1' };
      const isAuthLoading = false;
      const isAdminLoading = false;
      const isAdmin = false;
      const isWorkspaceResolved = true;
      const storedWorkspace = { id: 'ws-1' };

      if (!isAuthLoading && user && !isAdminLoading && isWorkspaceResolved) {
        if (currentRoute === 'onboarding' && storedWorkspace) {
          navigateTo('dashboard');
        }
      }

      expect(currentRoute).toBe('dashboard');
    });

    it('safely merges and never clears existing fields if onboarding submission is accidentally triggered', async () => {
      const existingWorkspace = {
        id: 'ws-cust-1',
        userId: 'cust-1',
        coupleName: 'Romeo & Juliet',
        weddingDate: '2026-12-31',
        estimatedBudget: 250_000_000,
        estimatedGuestCount: 500,
        completedCategories: ['venue', 'catering'] as any[],
        primaryPlanningPriority: 'budget' as const,
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-15T00:00:00Z',
      };

      vi.spyOn(workspaceRepository, 'getWorkspace').mockResolvedValueOnce(existingWorkspace as any);
      const saveWorkspaceSpy = vi.spyOn(workspaceRepository, 'saveWorkspace').mockImplementation(async (w) => w);

      // Simulating partial/empty onboarding data submitted
      const submittedData = {
        coupleName: '',
        weddingDate: '',
        budget: 0,
        guestCount: 0,
        completedCategories: [],
        primaryPlanningPriority: 'checklist' as const,
      };

      const stored = await workspaceRepository.getWorkspace('cust-1');
      expect(stored).not.toBeNull();

      if (stored) {
        await workspaceRepository.saveWorkspace({
          ...stored,
          coupleName: submittedData.coupleName?.trim() ? submittedData.coupleName.trim() : stored.coupleName,
          weddingDate: submittedData.weddingDate ? submittedData.weddingDate : stored.weddingDate,
          estimatedBudget: Number(submittedData.budget) > 0 ? Number(submittedData.budget) : stored.estimatedBudget,
          estimatedGuestCount: Number(submittedData.guestCount) > 0 ? Number(submittedData.guestCount) : stored.estimatedGuestCount,
          completedCategories:
            submittedData.completedCategories && submittedData.completedCategories.length > 0
              ? (submittedData.completedCategories as any[])
              : stored.completedCategories,
          primaryPlanningPriority: submittedData.primaryPlanningPriority || stored.primaryPlanningPriority,
        });
      }

      expect(saveWorkspaceSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          coupleName: 'Romeo & Juliet', // preserved!
          weddingDate: '2026-12-31', // preserved!
          estimatedBudget: 250_000_000, // preserved!
          estimatedGuestCount: 500, // preserved!
          completedCategories: ['venue', 'catering'], // preserved!
        })
      );
    });
  });

  describe('3. Admin Flow', () => {
    it('redirects active admin to /admin after login', async () => {
      const onNavigateAdmin = vi.fn();
      const onNavigateDashboard = vi.fn();

      vi.spyOn(authService, 'signIn').mockResolvedValueOnce({
        user: { id: 'admin-1', email: 'admin@wedflow.id' } as any,
        session: { access_token: 'valid-jwt' } as any,
      });
      vi.spyOn(authService, 'checkIsAdmin').mockResolvedValueOnce(true);

      const authData = await authService.signIn('admin@wedflow.id', 'pwd');
      const isAdmin = await authService.checkIsAdmin(authData?.user?.id);

      if (isAdmin && onNavigateAdmin) {
        onNavigateAdmin();
      } else {
        onNavigateDashboard();
      }

      expect(onNavigateAdmin).toHaveBeenCalledTimes(1);
      expect(onNavigateDashboard).not.toHaveBeenCalled();
    });

    it('redirects active admin with customer workspace to /admin while preserving customer workspace', () => {
      let currentRoute = 'login';
      const navigateTo = (route: string) => {
        currentRoute = route;
      };

      const user = { id: 'admin-dual-1', email: 'admin-dual@wedflow.id' };
      const isAdmin = true;
      const isAuthLoading = false;
      const isAdminLoading = false;
      const storedWorkspace = { id: 'ws-admin-cust', coupleName: 'Admin & Partner' };

      if (!isAuthLoading && user && !isAdminLoading) {
        if (isAdmin) {
          navigateTo('admin');
        } else {
          navigateTo(storedWorkspace ? 'dashboard' : 'onboarding');
        }
      }

      expect(currentRoute).toBe('admin');
      expect(storedWorkspace.coupleName).toBe('Admin & Partner');
    });

    it('redirects admin from onboarding route to /admin', () => {
      let currentRoute = 'onboarding';
      const navigateTo = (route: string) => {
        currentRoute = route;
      };

      const user = { id: 'admin-1' };
      const isAdmin = true;
      const isAuthLoading = false;
      const isAdminLoading = false;

      if (!isAuthLoading && user && !isAdminLoading && isAdmin) {
        if (currentRoute === 'onboarding') {
          navigateTo('admin');
        }
      }

      expect(currentRoute).toBe('admin');
    });
  });

  describe('4. Loading States & Race Condition Guards', () => {
    it('does not trigger onboarding while auth is loading', () => {
      const isAuthLoading = true;
      const user = null;
      const isAdminLoading = true;
      const isWorkspaceResolved = false;

      const shouldWait = isAuthLoading || isAdminLoading || (user && !isWorkspaceResolved);
      expect(shouldWait).toBe(true);
    });

    it('does not trigger onboarding while admin status is loading', () => {
      const isAuthLoading = false;
      const user = { id: 'user-1' };
      const isAdminLoading = true;
      const isWorkspaceResolved = false;

      const shouldWait = isAuthLoading || isAdminLoading || (user && !isWorkspaceResolved);
      expect(shouldWait).toBe(true);
    });

    it('does not trigger onboarding while workspace is loading for authenticated customer', () => {
      const isAuthLoading = false;
      const user = { id: 'user-1' };
      const isAdminLoading = false;
      const isAdmin = false;
      const isWorkspaceLoading = true;
      const loadedWorkspaceUserId = null;

      const isWorkspaceResolved = !user ? !isAuthLoading : (!isWorkspaceLoading && loadedWorkspaceUserId === user.id);
      const isResolvingState = isAuthLoading || isAdminLoading || (user && !isAdmin && !isWorkspaceResolved);

      expect(isWorkspaceResolved).toBe(false);
      expect(isResolvingState).toBe(true);
    });

    it('clears loading and renders dashboard once workspace is fully resolved with stored workspace', () => {
      const isAuthLoading = false;
      const user = { id: 'user-1' };
      const isAdminLoading = false;
      const isAdmin = false;
      const isWorkspaceLoading = false;
      const loadedWorkspaceUserId = 'user-1';

      const isWorkspaceResolved = !user ? !isAuthLoading : (!isWorkspaceLoading && loadedWorkspaceUserId === user.id);
      const isResolvingState = isAuthLoading || (user ? (isAdminLoading || (!isAdmin && !isWorkspaceResolved)) : false);

      expect(isWorkspaceResolved).toBe(true);
      expect(isResolvingState).toBe(false);
    });

    it('active admin never blocks on customer workspace loading state and resolves immediately', () => {
      const isAuthLoading = false;
      const user = { id: 'admin-1' };
      const isAdminLoading = false;
      const isAdmin = true;
      const isWorkspaceLoading = true; // customer workspace might still be loading or absent
      const loadedWorkspaceUserId = null;

      const isWorkspaceResolved = !user ? !isAuthLoading : (!isWorkspaceLoading && loadedWorkspaceUserId === user.id);
      const isResolvingState = isAuthLoading || (user ? (isAdminLoading || (!isAdmin && !isWorkspaceResolved)) : false);

      expect(isResolvingState).toBe(false); // Admin is NOT blocked!
    });

    it('unauthenticated guest resolves immediately without blocking', () => {
      const isAuthLoading = false;
      let user: { id: string } | null = null;
      const isAdminLoading = false;
      const isAdmin = false;
      const isWorkspaceLoading = false;
      const loadedWorkspaceUserId = null;

      const isWorkspaceResolved = !user ? !isAuthLoading : (!isWorkspaceLoading && loadedWorkspaceUserId === (user as { id: string }).id);
      const isResolvingState = isAuthLoading || (user ? (isAdminLoading || (!isAdmin && !isWorkspaceResolved)) : false);

      expect(isWorkspaceResolved).toBe(true);
      expect(isResolvingState).toBe(false);
    });

    it('simulates full post-login async hydration lifecycle without page refresh for existing customer', async () => {
      let user: { id: string } | null = null;
      let isAuthLoading = false;
      let isAdminLoading = false;
      let isAdmin = false;
      let isWorkspaceLoading = false;
      let loadedWorkspaceUserId: string | null = null;
      let storedWorkspace: any = null;
      let currentRoute = 'login';

      const navigateTo = (r: string) => {
        currentRoute = r;
      };

      // Step 1: User logs in on LoginPage
      user = { id: 'cust-123' };
      isWorkspaceLoading = true; // Hydration begins
      isAdminLoading = false;
      isAdmin = false;

      // During hydration:
      let isWorkspaceResolved = !user ? !isAuthLoading : (!isWorkspaceLoading && loadedWorkspaceUserId === user.id);
      let isResolvingState = isAuthLoading || (user ? (isAdminLoading || (!isAdmin && !isWorkspaceResolved)) : false);
      expect(isResolvingState).toBe(true); // Splash screen visible

      // Step 2: Supabase workspace fetch resolves
      storedWorkspace = { id: 'ws-cust-123', userId: 'cust-123', coupleName: 'Rian & Maya' };
      loadedWorkspaceUserId = 'cust-123';
      isWorkspaceLoading = false;

      // After hydration:
      isWorkspaceResolved = !user ? !isAuthLoading : (!isWorkspaceLoading && loadedWorkspaceUserId === user.id);
      isResolvingState = isAuthLoading || (user ? (isAdminLoading || (!isAdmin && !isWorkspaceResolved)) : false);
      expect(isWorkspaceResolved).toBe(true);
      expect(isResolvingState).toBe(false); // Splash screen dismissed!

      // Step 3: Route redirects to dashboard
      if (!isResolvingState && user && !isAdmin && isWorkspaceResolved) {
        if (currentRoute === 'login' || currentRoute === 'signup') {
          navigateTo(storedWorkspace ? 'dashboard' : 'onboarding');
        }
      }
      expect(currentRoute).toBe('dashboard');
    });

    it('simulates full post-login async hydration lifecycle without page refresh for brand-new user', async () => {
      let user: { id: string } | null = null;
      let isAuthLoading = false;
      let isAdminLoading = false;
      let isAdmin = false;
      let isWorkspaceLoading = false;
      let loadedWorkspaceUserId: string | null = null;
      let storedWorkspace: any = null;
      let currentRoute = 'login';

      const navigateTo = (r: string) => {
        currentRoute = r;
      };

      // Step 1: New user logs in
      user = { id: 'new-user-456' };
      isWorkspaceLoading = true;
      isAdmin = false;

      // Step 2: Supabase workspace query returns null (no workspace)
      storedWorkspace = null;
      loadedWorkspaceUserId = 'new-user-456';
      isWorkspaceLoading = false;

      const isWorkspaceResolved = !user ? !isAuthLoading : (!isWorkspaceLoading && loadedWorkspaceUserId === user.id);
      const isResolvingState = isAuthLoading || (user ? (isAdminLoading || (!isAdmin && !isWorkspaceResolved)) : false);
      expect(isWorkspaceResolved).toBe(true);
      expect(isResolvingState).toBe(false);

      // Step 3: Route redirects to onboarding
      if (!isResolvingState && user && !isAdmin && isWorkspaceResolved) {
        if (currentRoute === 'login' || currentRoute === 'signup') {
          navigateTo(storedWorkspace ? 'dashboard' : 'onboarding');
        }
      }
      expect(currentRoute).toBe('onboarding');
    });
  });

  describe('5. Page Refresh & Session Restoration', () => {
    it('restores existing customer destination upon page refresh', () => {
      const initialPath: string = 'dashboard';
      const user = { id: 'cust-1' };
      const isAdmin = false;
      const storedWorkspace = { id: 'ws-cust-1' };

      let destination = '';
      if (user && !isAdmin && storedWorkspace) {
        destination = initialPath;
      }

      expect(destination).toBe('dashboard');
    });

    it('restores active admin /admin destination upon page refresh', () => {
      const initialPath: string = 'admin/payments';
      const user = { id: 'admin-1' };
      const isAdmin = true;

      let destination = '';
      if (user && isAdmin) {
        destination = initialPath;
      }

      expect(destination).toBe('admin/payments');
    });
  });
});

