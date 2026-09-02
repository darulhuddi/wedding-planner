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
import { AuthModal } from './components/ui/AuthModal';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { Dashboard } from './components/dashboard/Dashboard';
import { ChecklistPage } from './components/checklist/ChecklistPage';
import { BudgetPage } from './components/budget/BudgetPage';
import { TimelinePage } from './components/timeline/TimelinePage';
import { VendorPage } from './components/vendor/VendorPage';
import { GuestPage } from './components/guest/GuestPage';
import { NotePage } from './components/note/NotePage';
import * as workspaceRepository from './repositories/workspaceRepository';
import { deriveWorkspaceViewModel, getDaysUntilWedding } from './domain/workspaceSelectors';
import { generateInitialTasks } from './utils/checklistUtils';
import { StoredWorkspace, WorkspaceViewModel } from './types/workspace';
import { TaskItem } from './types/checklist';
import { StoredBudget } from './types/budget';
import { Vendor } from './types/vendor';
import { Guest } from './types/guest';
import { Note } from './types/note';
import { CategoryId } from './types/onboarding';

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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function App() {
  const [currentRoute, setCurrentRoute] = useState<RoutePath>(() => {
    const path = window.location.pathname.toLowerCase().replace('/', '');
    if (path === 'onboarding') return 'onboarding';
    if (path === 'dashboard' || path === '') return path === 'dashboard' ? 'dashboard' : 'home';
    if (VENDOR_CATEGORY_IDS.has(path)) return 'vendor';
    return path;
  });

  const [vendorCategoryFilter, setVendorCategoryFilter] = useState<CategoryId | 'all'>(() => {
    const path = window.location.pathname.toLowerCase().replace('/', '');
    if (VENDOR_CATEGORY_IDS.has(path)) return path as CategoryId;
    return 'all';
  });

  // StoredWorkspace state read from repository
  const [storedWorkspace, setStoredWorkspace] = useState<StoredWorkspace | null>(() =>
    workspaceRepository.getWorkspace()
  );

  // Active workspace (stored or demo fallback)
  const effectiveStored: StoredWorkspace = storedWorkspace || MOCK_DEMO_WORKSPACE;

  // Single canonical task state lifted to App
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    const loaded = workspaceRepository.getTasks(effectiveStored.id);
    if (loaded.length > 0) return loaded;
    return generateInitialTasks({
      workspaceId: effectiveStored.id,
      completedCategories: effectiveStored.completedCategories,
      weddingDate: effectiveStored.weddingDate,
      daysUntilWedding: getDaysUntilWedding(effectiveStored.weddingDate),
    });
  });

  // Single canonical budget state
  const [budget, setBudget] = useState<StoredBudget>(() => 
    workspaceRepository.getBudget(effectiveStored.id)
  );

  // Single canonical vendor state
  const [vendors, setVendors] = useState<Vendor[]>(() =>
    workspaceRepository.getVendors(effectiveStored.id)
  );

  // Single canonical guest state
  const [guests, setGuests] = useState<Guest[]>(() =>
    workspaceRepository.getGuests(effectiveStored.id)
  );

  // Single canonical note state
  const [notes, setNotes] = useState<Note[]>(() =>
    workspaceRepository.getNotes(effectiveStored.id)
  );

  // Reload workspace & tasks when route changes (e.g. returning from onboarding)
  const refreshWorkspace = useCallback(() => {
    const freshStored = workspaceRepository.getWorkspace();
    setStoredWorkspace(freshStored);
    const activeStored = freshStored || MOCK_DEMO_WORKSPACE;
    const freshTasks = workspaceRepository.getTasks(activeStored.id);
    if (freshTasks.length > 0) {
      setTasks(freshTasks);
    } else {
      setTasks(
        generateInitialTasks({
          workspaceId: activeStored.id,
          completedCategories: activeStored.completedCategories,
          weddingDate: activeStored.weddingDate,
          daysUntilWedding: getDaysUntilWedding(activeStored.weddingDate),
        })
      );
    }
    
    setBudget(workspaceRepository.getBudget(activeStored.id));
    setVendors(workspaceRepository.getVendors(activeStored.id));
    setGuests(workspaceRepository.getGuests(activeStored.id));
    setNotes(workspaceRepository.getNotes(activeStored.id));
  }, []);

  const [authModalState, setAuthModalState] = useState<{
    isOpen: boolean;
    mode: 'signup' | 'login';
  }>({
    isOpen: false,
    mode: 'signup',
  });

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase().replace('/', '');
      if (VENDOR_CATEGORY_IDS.has(path)) {
        setVendorCategoryFilter(path as CategoryId);
        setCurrentRoute('vendor');
      } else {
        if (path === 'vendor') {
          // keep existing filter or default
        }
        setCurrentRoute(!path ? 'home' : path);
      }
      refreshWorkspace();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [refreshWorkspace]);

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
    refreshWorkspace();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Central task state mutation handler — updates App state & persists to repository
  const handleTaskChange = useCallback(
    (updatedTasks: TaskItem[]) => {
      setTasks(updatedTasks);
      workspaceRepository.saveTasks(effectiveStored.id, updatedTasks);
    },
    [effectiveStored.id]
  );

  const handleBudgetChange = useCallback(
    (updatedBudget: StoredBudget) => {
      setBudget(updatedBudget);
      workspaceRepository.saveBudget(effectiveStored.id, updatedBudget);
    },
    [effectiveStored.id]
  );

  const handleVendorChange = useCallback(
    (updatedVendors: Vendor[]) => {
      setVendors(updatedVendors);
      workspaceRepository.saveVendors(effectiveStored.id, updatedVendors);
    },
    [effectiveStored.id]
  );

  const handleGuestChange = useCallback(
    (updatedGuests: Guest[]) => {
      setGuests(updatedGuests);
      workspaceRepository.saveGuests(effectiveStored.id, updatedGuests);
    },
    [effectiveStored.id]
  );

  const handleNoteChange = useCallback(
    (updatedNotes: Note[]) => {
      setNotes(updatedNotes);
      workspaceRepository.saveNotes(effectiveStored.id, updatedNotes);
    },
    [effectiveStored.id]
  );

  const handleWorkspaceChange = useCallback(
    (updatedWorkspace: StoredWorkspace) => {
      setStoredWorkspace(updatedWorkspace);
      workspaceRepository.saveWorkspace(updatedWorkspace);
    },
    []
  );

  // Derived ViewModel computed dynamically at App boundary
  const viewModel: WorkspaceViewModel = useMemo(
    () => deriveWorkspaceViewModel(effectiveStored, tasks),
    [effectiveStored, tasks]
  );

  const handleOpenAuth = (mode: 'signup' | 'login') => {
    if (mode === 'signup') {
      navigateTo('onboarding');
    } else {
      setAuthModalState({ isOpen: true, mode: 'login' });
    }
  };

  const handleCloseAuth = () => {
    setAuthModalState((prev) => ({ ...prev, isOpen: false }));
  };

  // Render Onboarding View
  if (currentRoute === 'onboarding') {
    return (
      <OnboardingFlow
        onNavigateHome={() => navigateTo('home')}
        onNavigateDashboard={() => navigateTo('dashboard')}
      />
    );
  }

  // Render Dashboard Overview
  if (currentRoute === 'dashboard') {
    return (
      <Dashboard
        workspace={viewModel}
        tasks={tasks}
        budget={budget}
        onTaskChange={handleTaskChange}
        currentModule="dashboard"
        onNavigateModule={(module) => navigateTo(module)}
        onRestartOnboarding={() => navigateTo('onboarding')}
      />
    );
  }

  // Render Checklist Module
  if (currentRoute === 'checklist') {
    return (
      <ChecklistPage
        workspace={viewModel}
        tasks={tasks}
        onTaskChange={handleTaskChange}
        currentModule="checklist"
        onNavigateModule={(module) => navigateTo(module)}
      />
    );
  }

  // Render Budget Module
  if (currentRoute === 'budget') {
    return (
      <BudgetPage
        workspace={viewModel}
        budget={budget}
        onWorkspaceChange={handleWorkspaceChange}
        onBudgetChange={handleBudgetChange}
        currentModule="budget"
        onNavigateModule={(module) => navigateTo(module)}
      />
    );
  }

  // Render Timeline Module
  if (currentRoute === 'timeline') {
    return (
      <TimelinePage
        workspace={viewModel}
        tasks={tasks}
        onTaskChange={handleTaskChange}
        currentModule="timeline"
        onNavigateModule={(module) => navigateTo(module)}
      />
    );
  }

  // Render Vendor Module
  if (currentRoute === 'vendor') {
    return (
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
    );
  }

  // Render Guest Module
  if (currentRoute === 'guests') {
    return (
      <GuestPage
        workspace={viewModel}
        guests={guests}
        onGuestChange={handleGuestChange}
        currentModule="guests"
        onNavigateModule={(module) => navigateTo(module)}
      />
    );
  }

  // Render Note Module (Catatan v1)
  if (currentRoute === 'notes') {
    return (
      <NotePage
        workspace={viewModel}
        notes={notes}
        onNoteChange={handleNoteChange}
        currentModule="notes"
        onNavigateModule={(module) => navigateTo(module)}
      />
    );
  }

  // Render Homepage View (Default)
  return (
    <div className="min-h-screen bg-ivory text-charcoal flex flex-col selection:bg-burgundy-100 selection:text-burgundy-900">
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

      <AuthModal
        isOpen={authModalState.isOpen}
        initialMode={authModalState.mode}
        onClose={handleCloseAuth}
      />
    </div>
  );
}

export default App;
