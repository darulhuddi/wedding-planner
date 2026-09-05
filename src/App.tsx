import { useState, useEffect, useMemo, useCallback } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HeroSection } from './components/hero/HeroSection';
import { TrustStrip } from './components/sections/TrustStrip';
import { ProblemSection } from './components/sections/ProblemSection';
import { CoreFeaturesSection } from './components/sections/CoreFeaturesSection';
import { BudgetShowcase } from './components/sections/BudgetShowcase';
import { NextActionShowcase } from './components/sections/NextActionShowcase';
import { AtAGlanceSection } from './components/sections/AtAGlanceSection';
import { HowItWorksTestimonialSection } from './components/sections/HowItWorksTestimonialSection';
import { FinalCtaSection } from './components/sections/FinalCtaSection';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { Dashboard } from './components/dashboard/Dashboard';
import { ChecklistPage } from './components/checklist/ChecklistPage';
import { BudgetPage } from './components/budget/BudgetPage';
import { TimelinePage } from './components/timeline/TimelinePage';
import { VendorPage } from './components/vendor/VendorPage';
import { GuestPage } from './components/guest/GuestPage';
import { NotePage } from './components/note/NotePage';
import { SettingsPage } from './components/settings/SettingsPage';
import { LoginPage } from './components/auth/LoginPage';
import { SignUpPage } from './components/auth/SignUpPage';
import { AdminOverviewPage } from './components/admin/AdminOverviewPage';
import { AdminCouplesPage } from './components/admin/AdminCouplesPage';
import { AdminCoupleDetailPage } from './components/admin/AdminCoupleDetailPage';
import { AdminCustomerAccessPage } from './components/admin/AdminCustomerAccessPage';
import { AdminAccessPage } from './components/admin/AdminAccessPage';
import { AdminPaymentsPage } from './components/admin/AdminPaymentsPage';
import { CheckoutPage } from './components/checkout/CheckoutPage';
import { PaymentStatusPage } from './components/checkout/PaymentStatusPage';
import { AdministrationPage } from './components/administration/AdministrationPage';
import { DesktopSidebar } from './components/dashboard/DesktopSidebar';
import { BrandMark } from './components/brand';
import * as workspaceRepository from './repositories/workspaceRepository';
import { deriveWorkspaceViewModel, isWorkspaceOnboarded } from './domain/workspaceSelectors';
import { StoredWorkspace, WorkspaceViewModel } from './types/workspace';
import { TaskItem, TaskCategoryId } from './types/checklist';
import { StoredBudget } from './types/budget';
import { Vendor } from './types/vendor';
import { Guest } from './types/guest';
import { Note } from './types/note';
import { CategoryId } from './types/onboarding';
import { WeddingEvent } from './domain/events';
import { useAuth } from './auth/AuthContext';
import { AlertCircle, X } from 'lucide-react';

export type RoutePath =
  | 'home'
  | 'onboarding'
  | 'dashboard'
  | 'checkout'
  | 'payment/status'
  | 'checklist'
  | 'budget'
  | 'timeline'
  | 'vendor'
  | 'guests'
  | 'notes'
  | 'settings'
  | 'login'
  | 'signup'
  | 'venue'
  | 'catering'
  | 'photography'
  | 'decoration'
  | 'makeup_attire'
  | 'invitation'
  | 'admin'
  | 'admin/overview'
  | 'admin/couples'
  | 'admin/weddings'
  | 'admin/access'
  | 'admin/payments'
  | 'admin/system'
  | 'admin/settings'
  | string;

const VENDOR_CATEGORY_IDS = new Set<string>([
  'venue',
  'catering',
  'photography',
  'decoration',
  'makeup_attire',
  'invitation',
]);

const MOCK_DEMO_WORKSPACE: StoredWorkspace = {
  id: 'demo-workspace',
  coupleName: 'Adit & Amel',
  weddingDate: '2026-10-01',
  estimatedBudget: 100_000_000,
  estimatedGuestCount: 400,
  completedCategories: [],
  primaryPlanningPriority: 'timeline',
  religiousContexts: [],
  culturalContext: {
    hasTradition: null,
    description: null,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function App() {
  const { user, loading: isAuthLoading, isAdmin, isAdminLoading } = useAuth();

  const [currentRoute, setCurrentRoute] = useState<RoutePath>(() => {
    const path = window.location.pathname.toLowerCase().replace(/^\//, '');
    if (path === 'onboarding') return 'onboarding';
    if (path === 'login') return 'login';
    if (path === 'signup') return 'signup';
    if (path === 'checkout') return 'checkout';
    if (path.startsWith('payment/status')) return 'payment/status';
    if (path === 'admin' || path.startsWith('admin/')) return path;
    if (path === 'dashboard' || path === '') return path === 'dashboard' ? 'dashboard' : 'home';
    if (VENDOR_CATEGORY_IDS.has(path)) return 'checklist';
    return path;
  });

  const [checklistCategoryFilter, setChecklistCategoryFilter] = useState<TaskCategoryId | 'all'>(() => {
    const path = window.location.pathname.toLowerCase().replace('/', '');
    if (VENDOR_CATEGORY_IDS.has(path)) return path as TaskCategoryId;
    return 'all';
  });

  const [vendorCategoryFilter, setVendorCategoryFilter] = useState<CategoryId | 'all'>('all');

  const [storedWorkspace, setStoredWorkspace] = useState<StoredWorkspace | null>(null);
  const [loadedWorkspaceUserId, setLoadedWorkspaceUserId] = useState<string | null>(null);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState<boolean>(true);

  // Canonical workspace child entities
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [budget, setBudget] = useState<StoredBudget>({ allocations: [], expenses: [] });
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [events, setEvents] = useState<WeddingEvent[]>([]);

  // Mutation error banner state
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Fetch workspace and all child entities from Supabase for the authenticated user
  const loadWorkspaceData = useCallback(async (userId: string) => {
    setIsWorkspaceLoading(true);
    try {
      const freshStored = await workspaceRepository.getWorkspace(userId);
      setStoredWorkspace(freshStored);

      if (freshStored) {
        // Load all child entities in parallel from Supabase
        const [freshTasks, freshBudget, freshVendors, freshGuests, freshNotes, freshEvents] = await Promise.all([
          workspaceRepository.getTasks(freshStored.id),
          workspaceRepository.getBudget(freshStored.id),
          workspaceRepository.getVendors(freshStored.id),
          workspaceRepository.getGuests(freshStored.id),
          workspaceRepository.getNotes(freshStored.id),
          workspaceRepository.getEvents(freshStored.id),
        ]);

        setTasks(freshTasks);
        setBudget(freshBudget);
        setVendors(freshVendors);
        setGuests(freshGuests);
        setNotes(freshNotes);
        setEvents(freshEvents);
      } else {
        // Authenticated user has no workspace yet
        setTasks([]);
        setBudget({ allocations: [], expenses: [] });
        setVendors([]);
        setGuests([]);
        setNotes([]);
        setEvents([]);
      }
    } catch (error) {
      console.error('[WedFlow] Failed to load workspace data from Supabase:', error);
      setStoredWorkspace(null);
      setTasks([]);
    } finally {
      setLoadedWorkspaceUserId(userId);
      setIsWorkspaceLoading(false);
    }
  }, []);

  const refreshWorkspace = useCallback(async () => {
    if (user?.id) {
      await loadWorkspaceData(user.id);
    }
  }, [user?.id, loadWorkspaceData]);

  // Authoritative workspace hydration effect with cancellation guard
  useEffect(() => {
    let isCancelled = false;

    if (isAuthLoading) {
      return;
    }

    if (!user?.id) {
      setStoredWorkspace(null);
      setLoadedWorkspaceUserId(null);
      setTasks([]);
      setBudget({ allocations: [], expenses: [] });
      setVendors([]);
      setGuests([]);
      setNotes([]);
      setEvents([]);
      setIsWorkspaceLoading(false);
      return;
    }

    setIsWorkspaceLoading(true);
    (async () => {
      try {
        const freshStored = await workspaceRepository.getWorkspace(user.id);
        if (isCancelled) return;
        setStoredWorkspace(freshStored);

        if (freshStored) {
          const [freshTasks, freshBudget, freshVendors, freshGuests, freshNotes, freshEvents] = await Promise.all([
            workspaceRepository.getTasks(freshStored.id),
            workspaceRepository.getBudget(freshStored.id),
            workspaceRepository.getVendors(freshStored.id),
            workspaceRepository.getGuests(freshStored.id),
            workspaceRepository.getNotes(freshStored.id),
            workspaceRepository.getEvents(freshStored.id),
          ]);
          if (isCancelled) return;
          setTasks(freshTasks);
          setBudget(freshBudget);
          setVendors(freshVendors);
          setGuests(freshGuests);
          setNotes(freshNotes);
          setEvents(freshEvents);
        } else {
          if (isCancelled) return;
          setTasks([]);
          setBudget({ allocations: [], expenses: [] });
          setVendors([]);
          setGuests([]);
          setNotes([]);
          setEvents([]);
        }
      } catch (error) {
        if (isCancelled) return;
        console.error('[WedFlow] Failed to load workspace data from Supabase:', error);
        setStoredWorkspace(null);
        setTasks([]);
      } finally {
        if (!isCancelled) {
          setLoadedWorkspaceUserId(user.id);
          setIsWorkspaceLoading(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [user?.id, isAuthLoading]);

  // Determine if workspace state is authoritatively resolved for the active user
  const isWorkspaceResolved = !user ? !isAuthLoading : (!isWorkspaceLoading && loadedWorkspaceUserId === user.id);

  // Handle already-authenticated user navigating to login/signup/onboarding routes
  useEffect(() => {
    if (isAuthLoading || !user || isAdminLoading) {
      return;
    }

    if (isAdmin) {
      // Active Admin should never land on login, signup, or customer onboarding
      if (currentRoute === 'login' || currentRoute === 'signup' || currentRoute === 'onboarding') {
        navigateTo('admin');
      }
      return;
    }

    // Non-admin customer: MUST wait until workspace state is authoritatively resolved
    if (!isWorkspaceResolved) {
      return;
    }

    if (currentRoute === 'login' || currentRoute === 'signup') {
      if (isWorkspaceOnboarded(storedWorkspace)) {
        navigateTo('dashboard');
      } else {
        navigateTo('onboarding');
      }
    } else if (currentRoute === 'onboarding') {
      if (isWorkspaceOnboarded(storedWorkspace)) {
        // Existing customer should NEVER see onboarding again if already onboarded
        navigateTo('dashboard');
      }
    } else if (isAppRoute) {
      if (!isWorkspaceOnboarded(storedWorkspace)) {
        // Authenticated customer with un-onboarded / reset workspace must be routed to onboarding
        navigateTo('onboarding');
      }
    }
  }, [isAuthLoading, user, currentRoute, isAdmin, isAdminLoading, isWorkspaceResolved, storedWorkspace]);

  // Handle route popstate & back navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const path = window.location.pathname.toLowerCase().replace(/^\//, '');
      if (path === 'admin' || path.startsWith('admin/')) {
        setCurrentRoute(path);
      } else if (path === 'checkout') {
        setCurrentRoute('checkout');
      } else if (path.startsWith('payment/status')) {
        setCurrentRoute('payment/status');
      } else if (path === 'checklist') {
        const cat = event.state?.category || 'all';
        setChecklistCategoryFilter(cat);
        setCurrentRoute('checklist');
      } else if (path === 'vendor') {
        const cat = event.state?.category || 'all';
        setVendorCategoryFilter(cat);
        setCurrentRoute('vendor');
      } else if (VENDOR_CATEGORY_IDS.has(path)) {
        setChecklistCategoryFilter(path as TaskCategoryId);
        setCurrentRoute('checklist');
      } else {
        setCurrentRoute(!path ? 'home' : path);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (route: RoutePath, initialFilter?: TaskCategoryId | CategoryId | 'all') => {
    if (route === 'checklist') {
      const cat = (initialFilter as TaskCategoryId) || 'all';
      setChecklistCategoryFilter(cat);
      const path = '/checklist';
      window.history.pushState({ route: 'checklist', category: cat }, '', path);
      setCurrentRoute('checklist');
    } else if (route.startsWith('payment/status')) {
      const path = `/${route}`;
      window.history.pushState({ route }, '', path);
      setCurrentRoute('payment/status');
    } else if (VENDOR_CATEGORY_IDS.has(route)) {
      // Direct navigation to category -> opens Checklist with that category filter
      setChecklistCategoryFilter(route as TaskCategoryId);
      const path = '/checklist';
      window.history.pushState({ route: 'checklist', category: route }, '', path);
      setCurrentRoute('checklist');
    } else {
      if (route === 'vendor') {
        setVendorCategoryFilter((initialFilter as CategoryId) || 'all');
      }
      const path = route === 'home' ? '/' : `/${route}`;
      window.history.pushState({ route }, '', path);
      setCurrentRoute(route);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Active workspace (either real stored workspace or demo fallback if unauthenticated)
  const effectiveStored: StoredWorkspace = storedWorkspace || MOCK_DEMO_WORKSPACE;

  // ─── Optimistic Mutation Handlers with Automatic Rollback ─────────────────

  // 1. Task Mutations
  const handleTaskChange = useCallback(
    async (updatedTasks: TaskItem[]) => {
      const previousTasks = tasks;
      setTasks(updatedTasks);
      setMutationError(null);

      if (!storedWorkspace) return;

      try {
        if (updatedTasks.length > previousTasks.length) {
          const added = updatedTasks.find((t) => !previousTasks.some((p) => p.id === t.id));
          if (added) await workspaceRepository.createTask(storedWorkspace.id, added);
        } else if (updatedTasks.length < previousTasks.length) {
          const deleted = previousTasks.find((p) => !updatedTasks.some((u) => u.id === p.id));
          if (deleted) await workspaceRepository.deleteTask(storedWorkspace.id, deleted.id);
        } else {
          const modified = updatedTasks.find((t) => {
            const prev = previousTasks.find((p) => p.id === t.id);
            return !prev || JSON.stringify(prev) !== JSON.stringify(t);
          });
          if (modified) await workspaceRepository.updateTask(storedWorkspace.id, modified);
        }
      } catch (err: unknown) {
        console.error('[WedFlow] Failed to persist task mutation:', err);
        setTasks(previousTasks);
        setMutationError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan tugas.');
      }
    },
    [tasks, storedWorkspace]
  );

  // 1b. Bulk Task Creation (e.g. from Starter Plan Modal)
  const handleBulkAddTasks = useCallback(
    async (newTasks: TaskItem[]) => {
      if (newTasks.length === 0) return;
      const previousTasks = tasks;
      const combinedTasks = [...tasks, ...newTasks];
      setTasks(combinedTasks);
      setMutationError(null);

      if (!storedWorkspace) return;

      try {
        await workspaceRepository.bulkCreateTasks(storedWorkspace.id, newTasks);
      } catch (err: unknown) {
        console.error('[WedFlow] Failed to bulk create tasks in Supabase:', err);
        setTasks(previousTasks);
        setMutationError(err instanceof Error ? err.message : 'Gagal menyimpan rekomendasi tugas.');
        throw err;
      }
    },
    [tasks, storedWorkspace]
  );

  // 2. Budget Mutations
  const handleBudgetChange = useCallback(
    async (updatedBudget: StoredBudget) => {
      const previousBudget = budget;
      setBudget(updatedBudget);
      setMutationError(null);

      if (!storedWorkspace) return;

      try {
        // 2a. Expense Mutations
        if (updatedBudget.expenses.length > previousBudget.expenses.length) {
          const added = updatedBudget.expenses.find(
            (e) => !previousBudget.expenses.some((p) => p.id === e.id)
          );
          if (added) await workspaceRepository.createBudgetExpense(storedWorkspace.id, added);
        } else if (updatedBudget.expenses.length < previousBudget.expenses.length) {
          const deleted = previousBudget.expenses.find(
            (p) => !updatedBudget.expenses.some((u) => u.id === p.id)
          );
          if (deleted) await workspaceRepository.deleteBudgetExpense(storedWorkspace.id, deleted.id);
        } else {
          const modified = updatedBudget.expenses.find((e) => {
            const prev = previousBudget.expenses.find((p) => p.id === e.id);
            return !prev || JSON.stringify(prev) !== JSON.stringify(e);
          });
          if (modified) await workspaceRepository.updateBudgetExpense(storedWorkspace.id, modified);
        }

        // 2b. Allocation Mutations
        const allocationsChanged =
          JSON.stringify(updatedBudget.allocations) !== JSON.stringify(previousBudget.allocations);
        if (allocationsChanged) {
          await workspaceRepository.saveBudget(storedWorkspace.id, updatedBudget);
        }
      } catch (err: unknown) {
        console.error('[WedFlow] Failed to persist budget mutation:', err);
        setBudget(previousBudget);
        setMutationError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan budget.');
      }
    },
    [budget, storedWorkspace]
  );

  // 3. Vendor Mutations
  const handleVendorChange = useCallback(
    async (updatedVendors: Vendor[]) => {
      const previousVendors = vendors;
      const previousTasks = tasks;
      setVendors(updatedVendors);
      setMutationError(null);

      if (!storedWorkspace) return;

      try {
        if (updatedVendors.length > previousVendors.length) {
          const added = updatedVendors.find((v) => !previousVendors.some((p) => p.id === v.id));
          if (added) await workspaceRepository.createVendor(storedWorkspace.id, added);
        } else if (updatedVendors.length < previousVendors.length) {
          const deleted = previousVendors.find((p) => !updatedVendors.some((u) => u.id === p.id));
          if (deleted) {
            // Disassociate tasks referencing this vendor in local state
            const disassociatedTasks = tasks.map((t) =>
              t.vendorId === deleted.id ? { ...t, vendorId: null } : t
            );
            setTasks(disassociatedTasks);
            await workspaceRepository.deleteVendor(storedWorkspace.id, deleted.id);
          }
        } else {
          const modified = updatedVendors.find((v) => {
            const prev = previousVendors.find((p) => p.id === v.id);
            return !prev || JSON.stringify(prev) !== JSON.stringify(v);
          });
          if (modified) await workspaceRepository.updateVendor(storedWorkspace.id, modified);
        }
      } catch (err: unknown) {
        console.error('[WedFlow] Failed to persist vendor mutation:', err);
        setVendors(previousVendors);
        setTasks(previousTasks);
        setMutationError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan vendor.');
      }
    },
    [vendors, tasks, storedWorkspace]
  );

  // 4. Guest Mutations
  const handleGuestChange = useCallback(
    async (updatedGuests: Guest[]) => {
      const previousGuests = guests;
      setGuests(updatedGuests);
      setMutationError(null);

      if (!storedWorkspace) return;

      try {
        if (updatedGuests.length > previousGuests.length) {
          const added = updatedGuests.find((g) => !previousGuests.some((p) => p.id === g.id));
          if (added) await workspaceRepository.createGuest(storedWorkspace.id, added);
        } else if (updatedGuests.length < previousGuests.length) {
          const deleted = previousGuests.find((p) => !updatedGuests.some((u) => u.id === p.id));
          if (deleted) await workspaceRepository.deleteGuest(storedWorkspace.id, deleted.id);
        } else {
          const modified = updatedGuests.find((g) => {
            const prev = previousGuests.find((p) => p.id === g.id);
            return !prev || JSON.stringify(prev) !== JSON.stringify(g);
          });
          if (modified) await workspaceRepository.updateGuest(storedWorkspace.id, modified);
        }
      } catch (err: unknown) {
        console.error('[WedFlow] Failed to persist guest mutation:', err);
        setGuests(previousGuests);
        setMutationError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan data tamu.');
      }
    },
    [guests, storedWorkspace]
  );

  // 5. Note Mutations
  const handleNoteChange = useCallback(
    async (updatedNotes: Note[]) => {
      const previousNotes = notes;
      setNotes(updatedNotes);
      setMutationError(null);

      if (!storedWorkspace) return;

      try {
        if (updatedNotes.length > previousNotes.length) {
          const added = updatedNotes.find((n) => !previousNotes.some((p) => p.id === n.id));
          if (added) await workspaceRepository.createNote(storedWorkspace.id, added);
        } else if (updatedNotes.length < previousNotes.length) {
          const deleted = previousNotes.find((p) => !updatedNotes.some((u) => u.id === p.id));
          if (deleted) await workspaceRepository.deleteNote(storedWorkspace.id, deleted.id);
        } else {
          const modified = updatedNotes.find((n) => {
            const prev = previousNotes.find((p) => p.id === n.id);
            return !prev || JSON.stringify(prev) !== JSON.stringify(n);
          });
          if (modified) await workspaceRepository.updateNote(storedWorkspace.id, modified);
        }
      } catch (err: unknown) {
        console.error('[WedFlow] Failed to persist note mutation:', err);
        setNotes(previousNotes);
        setMutationError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan catatan.');
      }
    },
    [notes, storedWorkspace]
  );

  // 6. Workspace Mutations
  const handleWorkspaceChange = useCallback(
    async (updatedWorkspace: StoredWorkspace) => {
      const previousWorkspace = storedWorkspace;
      setStoredWorkspace(updatedWorkspace);
      setMutationError(null);

      try {
        await workspaceRepository.saveWorkspace(updatedWorkspace);
      } catch (err: unknown) {
        console.error('[WedFlow] Failed to update workspace in Supabase:', err);
        setStoredWorkspace(previousWorkspace);
        setMutationError(err instanceof Error ? err.message : 'Gagal memperbarui data workspace.');
      }
    },
    [storedWorkspace]
  );

  // 7. Event Mutations
  const handleEventCreate = useCallback(
    async (eventData: Omit<WeddingEvent, 'id' | 'createdAt' | 'updatedAt' | 'workspaceId'>) => {
      if (!storedWorkspace) return;
      const created = await workspaceRepository.createEvent(storedWorkspace.id, eventData);
      setEvents((prev) => [...prev, created]);
      return created;
    },
    [storedWorkspace]
  );

  const handleEventUpdate = useCallback(
    async (eventId: string, changes: Partial<WeddingEvent>) => {
      if (!storedWorkspace) return;
      const updated = await workspaceRepository.updateEvent(storedWorkspace.id, eventId, changes);
      setEvents((prev) => prev.map((ev) => (ev.id === eventId ? updated : ev)));
      return updated;
    },
    [storedWorkspace]
  );

  const handleEventDelete = useCallback(
    async (eventId: string) => {
      if (!storedWorkspace) return;
      await workspaceRepository.deleteEvent(storedWorkspace.id, eventId);
      setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
      setTasks((prev) =>
        prev.map((t) =>
          t.eventIds?.includes(eventId) ? { ...t, eventIds: t.eventIds.filter((id) => id !== eventId) } : t
        )
      );
    },
    [storedWorkspace]
  );

  // 7. Reset Wedding Planning Mutation (Atomic DB RPC + Local Storage & React State Cleanup)
  const handleResetPlanning = useCallback(async () => {
    if (!user?.id) return;
    setMutationError(null);

    try {
      // 1. Execute atomic RPC and clear planning LocalStorage
      await workspaceRepository.resetPlanningData();

      // 2. Fetch fresh stored workspace state from Supabase
      const freshStored = await workspaceRepository.getWorkspace(user.id);
      setStoredWorkspace(freshStored);

      // 3. Reset in-memory planning state
      setTasks([]);
      setBudget({ allocations: [], expenses: [] });
      setVendors([]);
      setGuests([]);
      setNotes([]);
      setEvents([]);

      // 4. Navigate to onboarding Step 1
      navigateTo('onboarding');
    } catch (err: unknown) {
      console.error('[WedFlow] Failed to reset planning data:', err);
      const msg = err instanceof Error ? err.message : 'Gagal mereset data perencanaan.';
      setMutationError(msg);
      throw err;
    }
  }, [user?.id]);

  // Derived ViewModel computed dynamically at App boundary
  const viewModel: WorkspaceViewModel = useMemo(
    () => deriveWorkspaceViewModel(effectiveStored, tasks),
    [effectiveStored, tasks]
  );

  const handleOpenAuth = (mode: 'signup' | 'login') => {
    if (mode === 'signup') {
      navigateTo('signup');
    } else {
      navigateTo('login');
    }
  };

  const isAdminRoute = currentRoute === 'admin' || currentRoute.startsWith('admin/');

  // Calm loading state while auth, admin status, or workspace data is resolving
  const isResolvingState =
    isAuthLoading ||
    (user ? (isAdminLoading || (!isAdmin && !isWorkspaceResolved)) : false);

  if (isResolvingState) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center selection:bg-burgundy-100 selection:text-burgundy-900">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <BrandMark size="lg" />
          <span className="font-serif text-lg font-semibold text-charcoal tracking-tight">
            Wed<span className="text-burgundy">Siap</span>
          </span>
        </div>
      </div>
    );
  }

  // Render Login View
  if (currentRoute === 'login') {
    return (
      <LoginPage
        onNavigateToSignup={() => navigateTo('signup')}
        onNavigateHome={() => navigateTo('home')}
        onNavigateDashboard={() => navigateTo('dashboard')}
        onNavigateAdmin={() => navigateTo('admin')}
      />
    );
  }

  // Render Sign Up View
  if (currentRoute === 'signup') {
    return (
      <SignUpPage
        onNavigateToLogin={() => navigateTo('login')}
        onNavigateHome={() => navigateTo('home')}
        onNavigateOnboarding={() => navigateTo('onboarding')}
      />
    );
  }

  // Render Onboarding View
  if (currentRoute === 'onboarding') {
    if (user && isAdmin) {
      return (
        <div className="min-h-screen bg-ivory flex items-center justify-center">
          <div className="text-center p-6">
            <p className="text-sm text-charcoal-500 mb-3">Mengarahkan ke Admin Dashboard...</p>
            <button
              onClick={() => navigateTo('admin')}
              className="px-4 py-2 bg-burgundy text-white rounded-xl text-sm cursor-pointer"
            >
              Buka Admin
            </button>
          </div>
        </div>
      );
    }

    if (user && isWorkspaceOnboarded(storedWorkspace)) {
      return (
        <div className="min-h-screen bg-ivory flex items-center justify-center">
          <div className="text-center p-6">
            <p className="text-sm text-charcoal-500 mb-3">Workspace Anda sudah aktif. Mengarahkan ke Dashboard...</p>
            <button
              onClick={() => navigateTo('dashboard')}
              className="px-4 py-2 bg-burgundy text-white rounded-xl text-sm cursor-pointer"
            >
              Buka Dashboard
            </button>
          </div>
        </div>
      );
    }

    return (
      <OnboardingFlow
        onNavigateHome={() => navigateTo('home')}
        onNavigateDashboard={async () => {
          await refreshWorkspace();
          navigateTo('dashboard');
        }}
      />
    );
  }

  // Admin Route Security Guard (UX Layer)
  if (isAdminRoute && !user) {
    return (
      <LoginPage
        onNavigateToSignup={() => navigateTo('signup')}
        onNavigateHome={() => navigateTo('home')}
        onNavigateDashboard={() => navigateTo('dashboard')}
        onNavigateAdmin={() => navigateTo(currentRoute === 'admin' ? 'admin' : currentRoute)}
      />
    );
  }


  if (isAdminRoute && user && !isAdmin) {
    return (
      <div className="min-h-screen bg-ivory flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 mb-4 shadow-xs">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-charcoal mb-2">Akses Ditolak</h1>
        <p className="text-charcoal-600 text-sm max-w-md mb-6 leading-relaxed">
          Akun Anda ({user.email}) tidak memiliki izin administrator untuk mengakses area kontrol internal WedSiap.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo('dashboard')}
            className="px-5 py-2.5 bg-burgundy-700 hover:bg-burgundy-800 text-white font-medium text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Kembali ke Dashboard
          </button>
          <button
            onClick={() => navigateTo('home')}
            className="px-5 py-2.5 bg-white hover:bg-ivory-100 text-charcoal border border-beige-300 font-medium text-sm rounded-xl transition-colors cursor-pointer"
          >
            Halaman Utama
          </button>
        </div>
      </div>
    );
  }

  // Check if user has access to app routes
  const isAppRoute = [
    'dashboard',
    'checklist',
    'budget',
    'timeline',
    'vendor',
    'guests',
    'notes',
    'settings',
  ].includes(currentRoute);

  if (isAppRoute && !user) {
    return (
      <LoginPage
        onNavigateToSignup={() => navigateTo('signup')}
        onNavigateHome={() => navigateTo('home')}
        onNavigateDashboard={() => navigateTo('dashboard')}
      />
    );
  }

  if (isAppRoute && user && !isWorkspaceOnboarded(storedWorkspace)) {
    return (
      <OnboardingFlow
        onNavigateHome={() => navigateTo('home')}
        onNavigateDashboard={async () => {
          await refreshWorkspace();
          navigateTo('dashboard');
        }}
      />
    );
  }

  // Global non-blocking error toast component
  const ErrorToast = mutationError ? (
    <div
      role="alert"
      className="fixed bottom-6 right-6 z-50 bg-charcoal-900 text-ivory px-4 py-3 rounded-2xl shadow-xl border border-charcoal-700 flex items-center gap-3 animate-fadeIn text-xs sm:text-sm max-w-md"
    >
      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold text-rose-300">Gagal Menyimpan Perubahan</p>
        <p className="text-charcoal-300">{mutationError}</p>
      </div>
      <button
        onClick={() => setMutationError(null)}
        className="text-charcoal-400 hover:text-white p-1 cursor-pointer"
        aria-label="Tutup notifikasi error"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  ) : null;


  // Render Admin Console Modules
  if (currentRoute === 'admin/payments' || currentRoute.startsWith('admin/payments')) {
    return (
      <AdminPaymentsPage
        currentRoute={currentRoute}
        onNavigate={(route) => navigateTo(route)}
      />
    );
  }

  if (currentRoute === 'admin/access' || currentRoute.startsWith('admin/access')) {
    return (
      <AdminAccessPage
        currentRoute={currentRoute}
        onNavigate={(route) => navigateTo(route)}
      />
    );
  }


  // Render Admin Couple Detail & Customer Access
  if (currentRoute.startsWith('admin/couples/')) {
    const subPath = currentRoute.replace(/^admin\/couples\//, '');
    const parts = subPath.split('/');
    const workspaceId = parts[0];
    const action = parts[1];

    if (action === 'access') {
      return (
        <AdminCustomerAccessPage
          workspaceId={workspaceId}
          onNavigate={(route) => navigateTo(route)}
        />
      );
    }

    return (
      <AdminCoupleDetailPage
        workspaceId={workspaceId}
        onNavigate={(route) => navigateTo(route)}
      />
    );
  }


  // Render Admin Couples List & Weddings
  if (currentRoute === 'admin/couples' || currentRoute === 'admin/weddings') {
    return (
      <AdminCouplesPage
        currentRoute={currentRoute}
        onNavigate={(route) => navigateTo(route)}
        onSelectCouple={(workspaceId) => {
          navigateTo(`admin/couples/${workspaceId}`);
        }}
      />
    );
  }

  if (currentRoute === 'admin' || currentRoute.startsWith('admin/')) {
    return (
      <AdminOverviewPage
        currentRoute={currentRoute}
        onNavigate={(route) => navigateTo(route)}
        onSelectCouple={(couple) => {
          navigateTo(`admin/couples/${couple.id}`);
        }}
      />
    );
  }

  // Render Checkout Page
  if (currentRoute === 'checkout') {
    return (
      <>
        {ErrorToast}
        <CheckoutPage
          workspace={viewModel}
          onNavigate={(route) => navigateTo(route)}
        />
      </>
    );
  }

  // Render Payment Status Verification Page
  if (currentRoute === 'payment/status') {
    return (
      <>
        {ErrorToast}
        <PaymentStatusPage
          workspace={viewModel}
          onNavigate={(route) => navigateTo(route)}
        />
      </>
    );
  }

  // Render Dashboard Overview
  if (currentRoute === 'dashboard') {
    return (
      <>
        {ErrorToast}
        <Dashboard
          workspace={viewModel}
          tasks={tasks}
          budget={budget}
          onTaskChange={handleTaskChange}
          currentModule="dashboard"
          onNavigateModule={(module, initialFilter) => navigateTo(module, initialFilter)}
          onRestartOnboarding={() => navigateTo('onboarding')}
        />
      </>
    );
  }

  // Render Checklist Module
  if (currentRoute === 'checklist') {
    return (
      <>
        {ErrorToast}
        <ChecklistPage
          workspace={viewModel}
          storedWorkspace={effectiveStored}
          tasks={tasks}
          events={events}
          onTaskChange={handleTaskChange}
          onBulkAddTasks={handleBulkAddTasks}
          currentModule="checklist"
          onNavigateModule={(module, initialFilter) => navigateTo(module, initialFilter)}
          initialCategoryFilter={checklistCategoryFilter}
        />
      </>
    );
  }

  // Render Administration Module
  if (currentRoute === 'administration' || currentRoute === 'administrasi') {
    return (
      <>
        {ErrorToast}
        <AdministrationPage
          workspace={viewModel}
          tasks={tasks}
          events={events}
          onWorkspaceChange={handleWorkspaceChange}
          onUpdateTask={(updatedTask) => {
            const newTasks = tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
            handleTaskChange(newTasks);
          }}
          onAddTask={(newTask) => {
            handleBulkAddTasks([newTask]);
          }}
          onBulkAddTasks={handleBulkAddTasks}
          currentModule="administration"
          onNavigateModule={(module) => navigateTo(module)}
        />
      </>
    );
  }

  // Render Budget Module
  if (currentRoute === 'budget') {
    return (
      <>
        {ErrorToast}
        <BudgetPage
          workspace={viewModel}
          budget={budget}
          onWorkspaceChange={handleWorkspaceChange}
          onBudgetChange={handleBudgetChange}
          currentModule="budget"
          onNavigateModule={(module) => navigateTo(module)}
        />
      </>
    );
  }

  // Render Timeline Module
  if (currentRoute === 'timeline') {
    return (
      <>
        {ErrorToast}
        <TimelinePage
          workspace={viewModel}
          tasks={tasks}
          onTaskChange={handleTaskChange}
          currentModule="timeline"
          onNavigateModule={(module) => navigateTo(module)}
        />
      </>
    );
  }

  // Render Vendor Module
  if (currentRoute === 'vendor') {
    return (
      <>
        {ErrorToast}
        <VendorPage
          workspace={viewModel}
          vendors={vendors}
          tasks={tasks}
          initialCategoryFilter={vendorCategoryFilter}
          onVendorChange={handleVendorChange}
          onTaskChange={handleTaskChange}
          currentModule="vendor"
          onNavigateModule={(module) => navigateTo(module)}
        />
      </>
    );
  }

  // Render Guest Module
  if (currentRoute === 'guests') {
    return (
      <>
        {ErrorToast}
        <GuestPage
          workspace={viewModel}
          guests={guests}
          onGuestChange={handleGuestChange}
          currentModule="guests"
          onNavigateModule={(module) => navigateTo(module)}
        />
      </>
    );
  }

  // Render Note Module
  if (currentRoute === 'notes') {
    return (
      <>
        {ErrorToast}
        <NotePage
          workspace={viewModel}
          notes={notes}
          onNoteChange={handleNoteChange}
          currentModule="notes"
          onNavigateModule={(module) => navigateTo(module)}
        />
      </>
    );
  }

  // Render Settings Module
  if (currentRoute === 'settings') {
    return (
      <>
        {ErrorToast}
        <SettingsPage
          workspace={viewModel}
          storedWorkspace={effectiveStored}
          tasks={tasks}
          events={events}
          onWorkspaceChange={handleWorkspaceChange}
          onTaskChange={handleTaskChange}
          onEventCreate={handleEventCreate}
          onEventUpdate={handleEventUpdate}
          onEventDelete={handleEventDelete}
          onResetPlanning={handleResetPlanning}
          currentModule="settings"
          onNavigateModule={(module) => navigateTo(module)}
        />
      </>
    );
  }

  // Render Homepage View (Default)
  return (
    <div className="min-h-screen bg-ivory text-charcoal flex flex-col selection:bg-burgundy-100 selection:text-burgundy-900">
      {ErrorToast}
      <Navbar onOpenAuth={handleOpenAuth} onNavigate={navigateTo} />

      <main className="flex-grow">
        <HeroSection onOpenAuth={handleOpenAuth} />
        <TrustStrip />
        <ProblemSection />
        <CoreFeaturesSection />
        <BudgetShowcase />
        <NextActionShowcase />
        <AtAGlanceSection />
        <HowItWorksTestimonialSection />
        <FinalCtaSection onOpenAuth={handleOpenAuth} />
      </main>

      <Footer />
    </div>
  );
}

export default App;
