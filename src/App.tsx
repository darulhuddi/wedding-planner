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
import { LoginPage } from './components/auth/LoginPage';
import { SignUpPage } from './components/auth/SignUpPage';
import * as workspaceRepository from './repositories/workspaceRepository';
import { deriveWorkspaceViewModel } from './domain/workspaceSelectors';
import { StoredWorkspace, WorkspaceViewModel } from './types/workspace';
import { TaskItem } from './types/checklist';
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
  | 'checklist'
  | 'budget'
  | 'timeline'
  | 'vendor'
  | 'guests'
  | 'notes'
  | 'login'
  | 'signup'
  | 'venue'
  | 'catering'
  | 'photography'
  | 'decoration'
  | 'makeup_attire'
  | 'invitation'
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
  const { user, loading: isAuthLoading } = useAuth();

  const [currentRoute, setCurrentRoute] = useState<RoutePath>(() => {
    const path = window.location.pathname.toLowerCase().replace('/', '');
    if (path === 'onboarding') return 'onboarding';
    if (path === 'login') return 'login';
    if (path === 'signup') return 'signup';
    if (path === 'dashboard' || path === '') return path === 'dashboard' ? 'dashboard' : 'home';
    if (VENDOR_CATEGORY_IDS.has(path)) return 'vendor';
    return path;
  });

  const [vendorCategoryFilter, setVendorCategoryFilter] = useState<CategoryId | 'all'>(() => {
    const path = window.location.pathname.toLowerCase().replace('/', '');
    if (VENDOR_CATEGORY_IDS.has(path)) return path as CategoryId;
    return 'all';
  });

  const [storedWorkspace, setStoredWorkspace] = useState<StoredWorkspace | null>(null);
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
  const loadWorkspace = useCallback(async () => {
    if (!user?.id) {
      setStoredWorkspace(null);
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
    try {
      const freshStored = await workspaceRepository.getWorkspace(user.id);
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
      setIsWorkspaceLoading(false);
    }
  }, [user?.id]);

  // Initial load or user auth state change
  useEffect(() => {
    if (!isAuthLoading) {
      loadWorkspace();
    }
  }, [isAuthLoading, loadWorkspace]);

  // Handle route popstate & back navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase().replace('/', '');
      if (VENDOR_CATEGORY_IDS.has(path)) {
        setVendorCategoryFilter(path as CategoryId);
        setCurrentRoute('vendor');
      } else {
        setCurrentRoute(!path ? 'home' : path);
      }
      loadWorkspace();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [loadWorkspace]);

  const navigateTo = (route: RoutePath, initialFilter?: CategoryId | 'all') => {
    if (VENDOR_CATEGORY_IDS.has(route)) {
      setVendorCategoryFilter(route as CategoryId);
      const path = '/vendor';
      window.history.pushState({ route: 'vendor', category: route }, '', path);
      setCurrentRoute('vendor');
    } else {
      if (route === 'vendor') {
        setVendorCategoryFilter(initialFilter || 'all');
      }
      const path = route === 'home' ? '/' : `/${route}`;
      window.history.pushState({ route }, '', path);
      setCurrentRoute(route);
    }
    loadWorkspace();
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
        await workspaceRepository.saveBudget(storedWorkspace.id, updatedBudget);
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

  // Calm loading state while auth or workspace data is resolving
  if (isAuthLoading || (user && isWorkspaceLoading)) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center selection:bg-burgundy-100 selection:text-burgundy-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-burgundy flex items-center justify-center text-ivory shadow-xs animate-pulse">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="12" r="5" stroke="#FAF8F3" strokeWidth="1.8" />
              <circle cx="15" cy="12" r="5" stroke="#B89A70" strokeWidth="1.8" />
            </svg>
          </div>
          <span className="font-serif text-lg font-semibold text-charcoal tracking-tight">
            Wed<span className="text-burgundy">Flow</span>
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
    return (
      <OnboardingFlow
        onNavigateHome={() => navigateTo('home')}
        onNavigateDashboard={() => navigateTo('dashboard')}
      />
    );
  }

  // Check if authenticated user has no workspace on app routes
  const isAppRoute = [
    'dashboard',
    'checklist',
    'budget',
    'timeline',
    'vendor',
    'guests',
    'notes',
  ].includes(currentRoute);

  if (user && !storedWorkspace && isAppRoute) {
    return (
      <OnboardingFlow
        onNavigateHome={() => navigateTo('home')}
        onNavigateDashboard={() => navigateTo('dashboard')}
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
          onNavigateModule={(module) => navigateTo(module)}
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

  // Render Homepage View (Default)
  return (
    <div className="min-h-screen bg-ivory text-charcoal flex flex-col selection:bg-burgundy-100 selection:text-burgundy-900">
      {ErrorToast}
      <Navbar onOpenAuth={handleOpenAuth} />

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
